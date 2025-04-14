import asyncio
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict

from dotenv import load_dotenv
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from langgraph.graph import END, START, StateGraph
from tavily import TavilyClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str) -> str:
        pass


class WatsonXProvider(LLMProvider):
    def __init__(self, model):
        self.model = model

    async def generate(self, prompt: str) -> str:
        response = await asyncio.to_thread(lambda: self.model.generate_text(prompt))
        return response.strip()


@dataclass
class EnrichmentContext:
    column_name: str
    target_value: str
    context_values: Dict[str, str]
    search_result: Dict = None
    answer: str = None


class EnrichmentPipeline:
    def __init__(self, tavily_client, llm_provider: LLMProvider):
        self.tavily = tavily_client
        self.llm = llm_provider

    async def search_tavily(self, state: EnrichmentContext):
        """Run Tavily search in a separate thread"""
        try:
            query = f"{state.column_name} of {state.target_value}?"
            logger.info(f"Searching Tavily with query: {query}")
            result = await asyncio.to_thread(
                lambda: self.tavily.search(
                    query=query,
                    search_depth="advanced",
                    max_results=5,
                )
            )
            logger.info("Tavily search completed")
            # urls = [result["url"] for result in result["results"]]
            print(f"Tavily search result: {result}")
            return {"search_result": result}
        except Exception as e:
            logger.error(f"Error in search_tavily: {str(e)}")
            raise

    async def extract_minimal_answer(self, state: EnrichmentContext) -> Dict:
        """Use LLM to extract a minimal answer from Tavily's results."""
        content = ""
        # Alternative implementation using list comprehension and join
        result_contents = [
            result["content"] for result in state.search_result["results"]
        ]
        content = "\n\n---\n\n".join(result_contents)
        # print(f"Content: {result['content']}")
        try:
            prompt = f"""
                    Extract the {state.column_name} of {state.target_value} from this search result:

                    {content}


                    Rules:
                    1. Provide ONLY the direct answer - no explanations
                    2. Be concise
                    3. If information is not found, respond "Information not found"
                    4. Do not provide citations or references
                    Direct Answer:
                    """
            logger.info(f"Extracting answer for {state.target_value}")

            answer = await self.llm.generate(prompt)
            logger.info(f"Prompt: {prompt}")
            logger.info(f"Extracted answer: {answer}")
            return {"answer": answer}
        except Exception as e:
            logger.error(f"Error in extract_minimal_answer: {str(e)}")
            return {"answer": "Information not found"}

    def build_graph(self):
        """build and compile the graph"""
        graph = StateGraph(EnrichmentContext)
        graph.add_node("search", self.search_tavily)
        graph.add_node("extract", self.extract_minimal_answer)
        # graph.add_node("enrich", self.enrich)
        graph.add_edge(START, "search")
        graph.add_edge("search", "extract")
        graph.add_edge("extract", END)
        compiled_graph = graph.compile()
        return compiled_graph


async def enrich_cell_with_graph(
    column_name: str,
    target_value: str,
    context_values: Dict[str, str],
    tavily_client,
    llm_provider: LLMProvider,
) -> Dict:
    """Helper function to enrich a single cell using langgraph."""
    try:
        logger.info(f"Starting enrich_cell_with_graph for {target_value}")
        pipeline = EnrichmentPipeline(tavily_client, llm_provider)
        initial_context = EnrichmentContext(
            column_name=column_name,
            target_value=target_value,
            context_values=context_values,
            search_result=None,
            answer=None,
        )
        graph = pipeline.build_graph()
        result = await graph.ainvoke(initial_context)
        # print(f"Result: {result}")
        logger.info(f"Completed enrich_cell_with_graph for {target_value}")
        return result  # , result['urls']
    except Exception as e:
        logger.error(f"Error in enrich_cell_with_graph: {str(e)}")
        return "Error during enrichment"


# Example usage:
if __name__ == "__main__":
    context = EnrichmentContext(
        column_name="CEO",
        target_value="Amazon",
        context_values={
            "Industry": "E-commerce",
            "Founded": "1994",
            "Location": "Seattle, WA",
        },
    )

    tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    watsonx_client = APIClient(
        Credentials(
            url="https://us-south.ml.cloud.ibm.com",
            api_key=os.getenv("WATSONX_API_KEY"),
        )
    )
    watsonx_model = ModelInference(
        model_id="ibm/granite-3-2-8b-instruct",
        api_client=watsonx_client,
        project_id=os.getenv("WATSONX_PROJECT_ID"),
        params={
            "decoding_method": "greedy",
            "max_new_tokens": 100,
            "min_new_tokens": 0,
            "temperature": 0,
        },
    )

    # Example with WatsonX
    watsonx_provider = WatsonXProvider(watsonx_model)
    pipeline_watsonx = EnrichmentPipeline(tavily_client, watsonx_provider)

    # Using the graph
    graph = pipeline_watsonx.build_graph()
    initial_context = EnrichmentContext(
        column_name="CEO",
        target_value="Amazon",
        context_values={
            "Industry": "E-commerce",
            "Founded": "1994",
            "Location": "Seattle, WA",
        },
        search_result=None,
        answer=None,
    )
    result = asyncio.run(graph.ainvoke(initial_context))

    # Or using the helper function
    result_helper = asyncio.run(
        enrich_cell_with_graph(
            column_name="CEO",
            target_value="Amazon",
            context_values={
                "Industry": "E-commerce",
                "Founded": "1994",
                "Location": "Seattle, WA",
            },
            tavily_client=tavily_client,
            llm_provider=watsonx_provider,
        )
    )
