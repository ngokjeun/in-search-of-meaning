import os
import pickle
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
from pymongo import MongoClient
import numpy as np
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

model = SentenceTransformer('all-MiniLM-L6-v2')

client = MongoClient('mongodb://localhost:27017/')
db = client['semsearch']
collection = db['cpf-faq']

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

def save_encodings(questions, filename='cache/encoded_questions.pkl'):
    if not os.path.exists('cache'):
        os.makedirs('cache')
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
        print(f"query: {query}\n")
        print(f"top {top_n} most similar questions found:")
        for result in results:
            print(f"\tquestion: {result['question']}")
            print(f"\tsimilarity score: {result['similarity_score']:.4f}")
            print(f"\tanswer: {result['answer']}\n")
    print("\n")
    print(f"\tDB time: {end_db_query - start_db_query:.4f} seconds")
    print(f"\tencode time: {end_encoding - start_encoding:.4f} seconds")
    print(f"\tcos time: {end_similarity - start_similarity:.4f} seconds")

    return {
        "query": query,
        "results": results,
        "timings": {
            "db_query_time": end_db_query - start_db_query,
            "encoding_time": end_encoding - start_encoding,
            "similarity_calc_time": end_similarity - start_similarity
        }
    }
