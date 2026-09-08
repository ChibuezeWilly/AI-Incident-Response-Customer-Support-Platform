from langgraph.graph import StateGraph, START, END
from agents.nodes.node_triager_agent import node_triager
from agents.nodes.rag_node import perform_rag
from agents.nodes.evaluator_node import evaluate_retrieved_docs, conditional_routing
from agents.state import GraphState
from agents.nodes.roberta_node import run_local_classifier
from agents.nodes.human_escalation import node_human_review_generator
from agents.nodes.qwen_vision_node import process_ticket_image

workflow = StateGraph(GraphState)

from api.background_tasks.escalate import escalate_to_l3

async def node_send_to_l3_engineering(state: GraphState) -> dict:
    """Adapt the Jira service function to LangGraph's state-node contract."""
    return await escalate_to_l3(state)


# add nodes
workflow.add_node("process_ticket_image_node", process_ticket_image)
workflow.add_node("classifier_node", run_local_classifier)
workflow.add_node("triager_node", node_triager)
workflow.add_node("rag_searcher_node", perform_rag)
workflow.add_node("evaluator_node", evaluate_retrieved_docs)
workflow.add_node("human_escalation_node", node_human_review_generator)

workflow.add_node("send_to_l3_engineering", node_send_to_l3_engineering)


workflow.add_edge(START, "process_ticket_image_node")
workflow.add_edge("process_ticket_image_node", "classifier_node")
workflow.add_edge("classifier_node", "triager_node")
workflow.add_edge("triager_node", "rag_searcher_node")
workflow.add_edge("rag_searcher_node", "evaluator_node")
workflow.add_edge("send_to_l3_engineering", END)
workflow.add_edge("human_escalation_node", END)

# add conditional node
workflow.add_conditional_edges(
    "evaluator_node",
    conditional_routing,
    {
        "pass": "human_escalation_node",
        "rewrite": "triager_node",
        "escalation": "send_to_l3_engineering",
    },
)

graph = None


def initialize_graph(checkpointer):
    global graph
    graph = workflow.compile(checkpointer=checkpointer)
    return graph


def get_graph():
    if graph is None:
        raise RuntimeError("The graph has not been initialized with a checkpointer.")
    return graph
