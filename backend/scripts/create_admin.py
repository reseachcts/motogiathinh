"""Create or reset the initial admin user. Safe to run multiple times."""
import asyncio
import os
import sys
import uuid

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://mgt:mgt_secret@db:5432/motogiathinh")
EMAIL = os.getenv("ADMIN_EMAIL", "admin@motogiathinh.vn")
PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
FULL_NAME = os.getenv("ADMIN_NAME", "Admin")


async def main() -> None:
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT id FROM users WHERE email = :e"), {"e": EMAIL})
        existing = result.scalar_one_or_none()

        pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

        if existing:
            await session.execute(
                text("UPDATE users SET password_hash = :h, is_active = true, deleted_at = NULL WHERE email = :e"),
                {"h": pw_hash, "e": EMAIL},
            )
            print(f"Updated existing admin: {EMAIL}")
        else:
            await session.execute(
                text("""
                    INSERT INTO users (id, email, password_hash, full_name, role, is_active, is_verified, branch_id)
                    VALUES (:id, :email, :hash, :name, 'admin', true, true, NULL)
                """),
                {"id": str(uuid.uuid4()), "email": EMAIL, "hash": pw_hash, "name": FULL_NAME},
            )
            print(f"Created admin: {EMAIL}")

        await session.commit()

    print(f"Password: {PASSWORD}")
    await engine.dispose()


asyncio.run(main())
