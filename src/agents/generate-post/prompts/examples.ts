/**
 * Example posts for few-shot prompting.
 * These examples guide the LLM in generating appropriately formatted posts.
 */
export const EXAMPLES = [
  `Agent Laboratory

An approach that leverages LLM agents capable of completing the entire research process.

Main findings:

1) Agents driven by o1-preview resulted in the best research outcomes

2) Generated machine learning code can achieve state-of-the-art performance compared to existing methods

3) Human feedback further improves the quality of research

4) Agent laboratory significantly reduces research expenses`,

  `rStar-Math helps small language models rival or even surpass OpenAI o1 on math reasoning.

How do they achieve this?

rStar-Math uses a math policy SLM for test-time search guided by an SLM-based process reward model.

What's new in rStar-Math?

- a code-augmented CoT data synthesis method involving MCTS to generate step-by-step verified reasoning trajectories which is used to train the policy SLM

- an SLM-based process reward model that reliably predicts a reward label for each math reasoning step. This leads to a more effective process preference model (PPM).

- a self-evolution recipe where the policy SLM and PPM are iteratively evolved to improve math reasoning.`,

  `🌲The promise of dynamic few-shot prompting

After sharing AppFolio's story of putting an agent in production, dynamic few shot prompting greatly improved their performance

This is how it works:

You collect a set of example inputs and example outputs. This set grows to be rather large. Rather than put all of them as few shot examples in the prompt, you dynamically select the 'k' most relevant ones based on the user query/state

Few shot examples in general can help give the LLM examples of what to do. We've found that this works particularly well in classification, extraction, and tone`,

  `Ever struggled to understand how users use your product?

I just built an open source implementation of Anthropic's internal clustering algorithm - CLIO.

With Gemini Flash, you can generate human readable labels which are clustered and grouped together to spot usage patterns.

Read more to find out how it works`,

  `RAG isn't just embeddings. It's a complex system that needs constant refinement.

Start with synthetic data. Use both full-text and vector search. Implement clear user feedback. Cluster topics. Monitor constantly.

The real work begins when you have enough data to truly optimize.`,

  `Most teams get RAG wrong. They obsess over generation before nailing search.

The secret? Start with synthetic data. Focus on retrieval. Build a continuous improvement loop.

It's not about perfection. It's about creating a learning system that compounds over time.`,

  `Introducing Llama 3.3 – a new 70B model that delivers the performance of our 405B model but is easier & more cost-efficient to run. By leveraging the latest advancements in post-training techniques including online preference optimization, this model improves core performance at a significantly lower cost, making it even more accessible to the entire open source community 🔥`,

  `The new Gemini 2.0 Flash Thinking model is very nice and fast. The prominent and pleasant surprise here is that unlike o1 the reasoning traces of the model are shown. As a user I personally really like this because the reasoning itself is interesting to see and read - the models actively think through different possibilities, ideas, debate themselves, etc., it's part of the value add.`,

  `Experimentation mindset is the key to AI success, not having all the answers.

Define metrics that matter, prioritize experiments, and redefine success as learning. Knowledge sharing is crucial.

Remove barriers to learning, not just run more experiments. Build team capability and improve incrementally.`,

  `One of my favorite applications of LLMs is reading books together. I want to ask questions or hear generated discussion (NotebookLM style) while it is automatically conditioned on the surrounding content. If Amazon or so built a Kindle AI reader that "just works" imo it would be a huge hit.`,
];
