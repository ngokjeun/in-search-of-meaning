from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
import time
from sentence_transformers import SentenceTransformer, util
import numpy as np
import pickle
import os

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

client = MongoClient('mongodb://localhost:27017/')
db = client['semsearch']
collection = db['cpf-faq']

# Create text index if it doesn't exist
collection.create_index([("question", "text"), ("answer", "text")])

# Define the model
model = SentenceTransformer('all-MiniLM-L6-v2')


def save_encodings(questions, filename='cache/encoded_questions.pkl'):
    with open(filename, 'wb') as f:
        pickle.dump(questions, f)


def load_encodings(filename='cache/encoded_questions.pkl'):
    if os.path.exists(filename):
        with open(filename, 'rb') as f:
            return pickle.load(f)
    return None


class QueryRequest(BaseModel):
    query: str
    top_n: int = 3


@app.get("/get_qa_data")
def get_qa_data():
    qa_data = []
    for entry in collection.find():
        question = entry.get("question")
        answer = entry.get("answer")
        if question and answer:
            qa_data.append({"question": question, "answer": answer})
    return qa_data


@app.post("/find_most_similar_questions")
def find_most_similar_questions(request: QueryRequest):
    query = request.query
    top_n = request.top_n

    start_db_query = time.time()
    questions = list()
    answers = dict()
    for entry in collection.find():
        question = entry.get("question")
        answer = entry.get("answer")
        if question and answer:
            questions.append(question)
            answers[question] = answer
    end_db_query = time.time()

    encoded_data = load_encodings()
    if encoded_data and encoded_data['questions'] == questions:
        question_embeddings = encoded_data['embeddings']
    else:
        start_encoding = time.time()
        question_embeddings = model.encode(questions)
        save_encodings(
            {'questions': questions, 'embeddings': question_embeddings})
        end_encoding = time.time()

    start_encoding = time.time()
    query_embedding = model.encode([query])
    end_encoding = time.time()

    start_similarity = time.time()
    similarities = util.cos_sim(query_embedding, question_embeddings)[0]
    similarities_np = similarities.cpu().numpy()
    end_similarity = time.time()

    if similarities_np is None or len(similarities_np) == 0:
        raise HTTPException(status_code=404, detail="No similarities found.")

    try:
        top_indices = np.argsort(similarities_np)[::-1][:top_n]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error sorting similarities: {e}")

    most_similar_questions = [
        (questions[i], float(similarities_np[i])) for i in top_indices]

    results = []
    for question, similarity in most_similar_questions:
        results.append({
            "question": question,
            "similarity_score": similarity,
            "answer": answers[question]
        })

    return {
        "query": query,
        "results": results,
        "timings": {
            "db_query_time": end_db_query - start_db_query,
            "encoding_time": end_encoding - start_encoding,
            "similarity_calc_time": end_similarity - start_similarity
        }
    }


@app.get("/search")
def search(search_term: str = Query(None, min_length=1)):
    results = collection.find({
        "$text": {
            "$search": search_term
        }
    }, {
        "score": {"$meta": "textScore"}
    }).sort([("score", {"$meta": "textScore"})])

    return [{"question": result["question"], "answer": result["answer"]} for result in results]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
