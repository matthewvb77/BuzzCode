# TestWise

### Description:
> VS Code extension that enhances Test-Driven Development with Github Copilot via repeated sampling

### Use Case:

> **Developer:** Writes test[s] for desired component and asks Copilot to generate component that does <X> and passes test[s] <Y>.

> **Extension:** Generates the component -> runs the test[s] -> if a test fails, feed codex the failed test, re-generate component until success or a max number of samples has been reached

### Why it might be valuable:
> OpenAI’s paper here on evaluating Codex (Copilot is powered by Codex) describes that, “repeated sampling from the model is a surprisingly effective strategy for producing working solutions to difficult prompts.” The model solves 28.8% of the HumanEval evaluation problem set with 1 sample per problem, and 70.2% of the problems with 100 samples per problem

### Potential:
> If the extension could feed Copilot the tests that the component failed and copilot could use the failed tests as context to remake the component better, it would be much more effective than thoughtless repeated sampling.
