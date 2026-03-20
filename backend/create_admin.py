import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid

async def create_admin():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_database']
    hashed = bcrypt.hashpw('*50*Pd*50*78'.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        'user_id': user_id,
        'email': 'admin@spotcar.com',
        'name': 'Admin',
        'password_hash': hashed,
        'role': 'admin',
        'is_admin': True,
        'is_banned': False,
        'total_points': 0,
        'spot_count': 0,
        'badges': []
    })
    print('Admin créé !')
    client.close()

asyncio.run(create_admin())