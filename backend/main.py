from fastapi import FastAPI, HTTPException, Depends, Query, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel, EmailStr
from datetime import timedelta
from jose import JWTError
import logging
import time
import pickle
import os
import numpy as np
from sentence_transformers import SentenceTransformer, util
from auth import Authenticator
from datetime import datetime

app = FastAPI()
auth = Authenticator()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['semsearch']
users_collection = db['users']
collection = db['cpf-faq']

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserRegister(BaseModel):
    email: EmailStr
    password: str

@app.post("/register")
def register(email: str = Form(...), password: str = Form(...)):
    logger.info("Received registration request for email: %s", email)
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        logger.warning("Email already registered: %s", email)
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth._get_hash(password)
    logger.info("Hashed password for email: %s", email)
    
    user_data = {"email": email, "hashed_password": hashed_password}
    result = users_collection.insert_one(user_data)
    
    if result.inserted_id:
        logger.info("User registered successfully with email: %s", email)
        return {"msg": "User registered successfully"}
    else:
        logger.error("Failed to register user with email: %s", email)
        raise HTTPException(status_code=500, detail="Failed to register user")

@app.post("/token")
def login_for_access_token(email: str = Form(...), password: str = Form(...)):
    user = users_collection.find_one({"email": email})
    if not user or not auth._verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=30)
    access_token = auth._create_access_token(data={"sub": email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(auth.oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

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

