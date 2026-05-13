"""
Covasant Continuum — AI Service
Multi-provider abstraction layer for AI chat (OpenAI, Anthropic, Gemini).
"""

from app.core.config import get_settings

settings = get_settings()


class AIService:
    """Multi-provider AI abstraction. Super Admin can switch providers dynamically."""

    async def chat(self, messages: list[dict], tenant_id: str | None = None) -> str:
        """Send messages to the configured AI provider and get a response."""
        from app.db.session import async_session_maker
        from sqlalchemy import select
        from app.models.models import PlatformSetting
        
        provider = settings.DEFAULT_AI_PROVIDER
        model_name = settings.DEFAULT_AI_MODEL
        
        try:
            async with async_session_maker() as db:
                result = await db.execute(select(PlatformSetting).where(PlatformSetting.key.in_(["active_ai_provider", "active_ai_model"])))
                db_settings = result.scalars().all()
                for s in db_settings:
                    if s.key == "active_ai_provider" and s.value:
                        provider = s.value
                    elif s.key == "active_ai_model" and s.value:
                        model_name = s.value
        except Exception:
            pass

        if provider == "anthropic":
            return await self._anthropic_chat(messages, tenant_id, model_name)
        elif provider == "openai":
            return await self._openai_chat(messages, tenant_id, model_name)
        elif provider == "gemini":
            return await self._gemini_chat(messages, tenant_id, model_name)
        else:
            return "AI provider not configured. Contact your administrator."

    async def _anthropic_chat(self, messages: list[dict], tenant_id: str | None, model_name: str) -> str:
        if not settings.ANTHROPIC_API_KEY:
            return "Anthropic API key not configured."
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

            system_prompt = self._build_system_prompt(tenant_id)
            api_messages = [{"role": m["role"], "content": m["content"]}
                           for m in messages if m["role"] in ("user", "assistant")]

            response = await client.messages.create(
                model=model_name,
                max_tokens=1024,
                system=system_prompt,
                messages=api_messages,
            )
            return response.content[0].text
        except Exception as e:
            return f"AI error: {str(e)[:200]}"

    async def _openai_chat(self, messages: list[dict], tenant_id: str | None, model_name: str) -> str:
        if not settings.OPENAI_API_KEY:
            return "OpenAI API key not configured."
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            system_prompt = self._build_system_prompt(tenant_id)
            api_messages = [{"role": "system", "content": system_prompt}]
            api_messages += [{"role": m["role"], "content": m["content"]}
                            for m in messages if m["role"] in ("user", "assistant")]

            response = await client.chat.completions.create(
                model=model_name,
                messages=api_messages,
                max_tokens=1024,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            return f"AI error: {str(e)[:200]}"

    async def _gemini_chat(self, messages: list[dict], tenant_id: str | None, model_name: str) -> str:
        if not settings.GOOGLE_AI_API_KEY:
            return "Google AI API key not configured."
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
            model = genai.GenerativeModel(model_name, system_instruction=self._build_system_prompt(tenant_id))

            prompt = ""
            for m in messages:
                role = "User" if m["role"] == "user" else "Assistant"
                prompt += f"{role}: {m['content']}\n"
            prompt += "Assistant: "

            response = await model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"AI error: {str(e)[:200]}"

    @staticmethod
    def _build_system_prompt(tenant_id: str | None) -> str:
        base = (
            "You are Continuum AI, Covasant's enterprise knowledge repository assistant. "
            "You help users find documents, understand release notes, and navigate the platform. "
            "Be concise, professional, and helpful. Keep responses under 200 words unless asked for detail."
        )
        if tenant_id:
            base += f" This user belongs to tenant {tenant_id}. Only reference documents they have access to."
        return base


# Singleton
ai_service = AIService()
