from cryptography.fernet import Fernet
import base64
import os

# Use fixed key (store in env in production)
SECRET_KEY = b'c3VwZXItc2VjcmV0LWtleS1jaGFpbnZvdGU='  # base64 key

cipher = Fernet(SECRET_KEY)

def encrypt_vote(candidate_id):
    return cipher.encrypt(str(candidate_id).encode()).decode()

def decrypt_vote(encrypted_vote):
    return int(cipher.decrypt(encrypted_vote.encode()).decode())