# mypy: disable - error - code = "no-untyped-def,misc"
import base64
import io
import os
import pathlib
from fastapi import FastAPI, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Define the FastAPI app
app = FastAPI()

# Allow local dev origins (Vite + LangGraph dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY is None:
    raise ValueError("GEMINI_API_KEY is not set")

image_client = genai.Client(api_key=GEMINI_API_KEY)
# Per request: use Gemini 3 image preview model
IMAGE_MODEL = "gemini-3-pro-image-preview"


class ImageRequest(BaseModel):
    prompt: str
    number_of_images: int = 1
    aspect_ratio: str = "3:4"
    image_size: str = "1K"
    use_search: bool = True


@app.post("/generate_image")
def generate_image(req: ImageRequest):
    """Generate an image for a given prompt and return base64 data URLs."""
    try:
        tools = [{"google_search": {}}] if req.use_search else []
        response = image_client.models.generate_content(
            model=IMAGE_MODEL,
            contents=req.prompt,
            config=types.GenerateContentConfig(
                tools=tools,
                image_config=types.ImageConfig(
                    aspect_ratio=req.aspect_ratio,
                    image_size=req.image_size,
                ),
            ),
        )
        # Collect any inline image parts from response (support both .parts and candidates content)
        parts = []
        if getattr(response, "parts", None):
            parts = [part for part in response.parts if getattr(part, "inline_data", None)]
        if not parts and getattr(response, "candidates", None):
            for candidate in response.candidates:
                if getattr(candidate, "content", None) and getattr(candidate.content, "parts", None):
                    for part in candidate.content.parts:
                        if getattr(part, "inline_data", None):
                            parts.append(part)

        if not parts:
            detail = {
                "error": "No image content returned",
                "prompt_feedback": getattr(response, "prompt_feedback", None),
                "finish_reason": getattr(response.candidates[0], "finish_reason", None)
                if getattr(response, "candidates", None)
                else None,
            }
            raise HTTPException(status_code=500, detail=detail)

        images = []
        for part in parts[: req.number_of_images]:
            data_bytes = part.inline_data.data
            b64 = base64.b64encode(data_bytes).decode("ascii")
            mime_type = part.inline_data.mime_type or "image/png"
            images.append(f"data:{mime_type};base64,{b64}")
        return {"images": images}
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def create_frontend_router(build_dir="../frontend/dist"):
    """Creates a router to serve the React frontend.

    Args:
        build_dir: Path to the React build directory relative to this file.

    Returns:
        A Starlette application serving the frontend.
    """
    build_path = pathlib.Path(__file__).parent.parent.parent / build_dir

    if not build_path.is_dir() or not (build_path / "index.html").is_file():
        print(
            f"WARN: Frontend build directory not found or incomplete at {build_path}. Serving frontend will likely fail."
        )
        # Return a dummy router if build isn't ready
        from starlette.routing import Route

        async def dummy_frontend(request):
            return Response(
                "Frontend not built. Run 'npm run build' in the frontend directory.",
                media_type="text/plain",
                status_code=503,
            )

        return Route("/{path:path}", endpoint=dummy_frontend)

    return StaticFiles(directory=build_path, html=True)


# Mount the frontend under /app to not conflict with the LangGraph API routes
app.mount(
    "/app",
    create_frontend_router(),
    name="frontend",
)
