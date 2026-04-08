import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_AI_STUDIO_API_KEY"))
for m in client.models.list():
    if "004" in m.name:
        print(m.name, m.supported_actions)

