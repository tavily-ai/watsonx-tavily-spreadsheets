import asyncio
import logging
import os
import sys
import time
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from pydantic import BaseModel
from tavily import TavilyClient

from backend.graph import WatsonXProvider, enrich_cell_with_graph

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

load_dotenv()

# Initialize API keys from environment
tavily_api_key = os.getenv("TAVILY_API_KEY")
watsonx_api_key = os.getenv("WATSONX_API_KEY")
watsonx_project_id = os.getenv("WATSONX_PROJECT_ID")


app = FastAPI(
    title="Data Enrichment API",
    description="API for enriching spreadsheet data using Tavily and AI models",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients at module level (similar to enrich.py)
tavily_client = None
watsonx_provider = None


def init_clients():
    """Initialize all clients that have valid API keys"""
    global tavily_client, watsonx_provider

    # Only initialize once
    if tavily_client is None:
        # Tavily client (required for all operations)
        if not tavily_api_key:
            raise ValueError("Tavily API key is required")
        tavily_client = TavilyClient(api_key=tavily_api_key)

        if watsonx_api_key and watsonx_project_id:
            watsonx_client = APIClient(
                Credentials(
                    url="https://us-south.ml.cloud.ibm.com",
                    api_key=watsonx_api_key,
                )
            )
            watsonx_model = ModelInference(
                model_id=os.getenv(
                    "FOUNDATION_MODEL_ID", "ibm/granite-3-2-8b-instruct"
                ),
                api_client=watsonx_client,
                project_id=watsonx_project_id,
                params={
                    "decoding_method": "greedy",
                    "max_new_tokens": 100,
                    "min_new_tokens": 0,
                    "temperature": 0,
                },
            )
            watsonx_provider = WatsonXProvider(watsonx_model)
            return watsonx_provider


watsonx_provider = init_clients()


class SearchResult(BaseModel):
    title: str
    url: str


class BatchEnrichmentRequest(BaseModel):
    column_name: str
    rows: List[str]  # List of target values to enrich
    context_values: Dict[str, str]
    answer: str = None
    search_result: str = None


class BatchEnrichmentResponse(BaseModel):
    enriched_values: List[str]
    status: str
    error: Optional[str] = None
    sources: List[List[SearchResult]] = []


@app.post("/api/enrich/batch", response_model=BatchEnrichmentResponse)
async def enrich_batch(request: BatchEnrichmentRequest):
    """Enrich multiple rows in parallel."""
    start_time = time.time()
    try:

        logger.info(f"Starting batch enrichment for column: {request.column_name}")
        logger.info(f"Number of rows to process: {len(request.rows)}")

        # Process each row
        tasks = []
        for row in request.rows:
            if row.strip():
                task = enrich_cell_with_graph(
                    column_name=request.column_name,
                    target_value=row,
                    context_values=request.context_values,
                    tavily_client=tavily_client,
                    llm_provider=watsonx_provider,
                )
                tasks.append(task)

        # Measure the time for the enrichment operations
        enrich_start_time = time.time()
        enriched_values = (
            await asyncio.gather(*tasks, return_exceptions=True) if tasks else []
        )
        enrich_time = time.time() - enrich_start_time

        # Process results and fill empty rows
        final_values = []
        all_sources = []
        processed_idx = 0

        for row in request.rows:
            if not row.strip():
                final_values.append("")
                all_sources.append([])
            else:
                value = enriched_values[processed_idx]
                sources = []

                if isinstance(value, dict) and "search_result" in value:
                    for result in value["search_result"]["results"]:
                        sources.append(
                            SearchResult(title=result["title"], url=result["url"])
                        )
                    final_values.append(value.get("answer", str(value)))
                elif isinstance(value, Exception):
                    final_values.append("Error during enrichment")
                else:
                    final_values.append(str(value))

                all_sources.append(sources)
                processed_idx += 1

        total_time = time.time() - start_time
        avg_time_per_row = enrich_time / len(tasks) if tasks else 0
        logger.info(
            f"Batch enrichment completed in {enrich_time:.2f}s (total request: {total_time:.2f}s)"
        )
        logger.info(f"Average time per row: {avg_time_per_row:.2f}s")

        print(
            BatchEnrichmentResponse(
                enriched_values=final_values, status="success", sources=all_sources
            )
        )
        return BatchEnrichmentResponse(
            enriched_values=final_values, status="success", sources=all_sources
        )

    except ValueError as e:
        logger.error(f"Invalid provider configuration: {str(e)}")
        total_time = time.time() - start_time
        logger.info(f"Request failed in {total_time:.2f}s")
        return BatchEnrichmentResponse(
            enriched_values=["Provider configuration error"] * len(request.rows),
            status="error",
            error=str(e),
        )
    except Exception as e:
        logger.error(f"Error in batch enrichment: {str(e)}")
        total_time = time.time() - start_time
        logger.info(f"Request failed in {total_time:.2f}s")
        return BatchEnrichmentResponse(
            enriched_values=["Error during enrichment"] * len(request.rows),
            status="error",
            error=str(e),
            sources=[[] for _ in request.rows],
        )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
