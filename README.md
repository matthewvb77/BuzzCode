# BuzzCode: Jr Developer In Your IDE

**Demo video coming soon!**

## Setup

1. Get an OpenAI key from https://platform.openai.com/account/api-keys
2. Save it in BuzzCode Settings by using the <span style="color:#FEDD02">BuzzCode: Settings</span> command in the developer console (ctrl + shift + p)
3. Open the BuzzCode tab from the sidebar and start coding!

## Tips and Tricks

To achieve the best results, be as specific as possible.

<span style="color:orange">Please also be careful with what you run! This extension is far from perfect and runs real code and terminal commands.</span>

## How it works

The BuzzCode extension provides an **AI-to-Computer interface** to an OpenAI GPT model.

When the user submits a task, one of OpenAI's GPT models generates a subtask list using these interface functions:

- executeTerminalCommand(command)
- generateFile(fileName, fileContents)
- askUser(question)
- Recurse(newPrompt)

The user then has 3 choices: confirm, cancel, and regenerate. Confirming will start the execution of the subtask list.

## Feedback & Suggestions

Feel free to join our [Discord Server](https://discord.gg/8UQTFvg8e7). We have dedicated channels for reporting bugs, suggesting new features, and general discussions related to the extension.

We're looking forward to hearing from you and improving **BuzzCode** based on your feedback!

## Credits

This extension is powered by [OpenAI's GPT Models](https://openai.com/research/) and uses json-fixing functions from [AutoGPT](https://github.com/Significant-Gravitas/Auto-GPT).

Happy coding! 🐝
