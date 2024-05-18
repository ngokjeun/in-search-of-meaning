import os
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import timedelta, datetime

class Authenticator:
    def __init__(self):
        load_dotenv()
        self.SECRET_KEY = os.environ.get("SECRET_KEY")
        self.ALGORITHM = "HS256"
        self.ACESS_TOKEN_EXPIRE_MINUTES = 30

        self.pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
        self.oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
        
    def _verify_password(self, plain_password, hashed):
        return self.pwd_context.verify(plain_password, hashed)

    def _get_hash(self, password):
        return self.pwd_context.hash(password)

    def _create_access_token(self, data:dict, expires_delta: timedelta = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
        return encoded_jwt
