// THIS IS PAST CODE FROM EXTENSION.JS
// const input = await vscode.window.showInputBox({
// 				prompt: "Ask code-davinci-003 a question",
// 				placeHolder: "put question here",
// 			});

// 			if (input) {
// 				// configuring openai -------------------------------------------------- test
// 				dotenv.config({ path: "C:\\Users\\vbmat\\Projects\\testwise\\.env" });

// 				const configuration = new Configuration({
// 					apiKey: process.env.OPENAI_API_KEY,
// 				});
// 				const openai = new OpenAIApi(configuration);
// 				const modelName = "text-davinci-003";
// 				const response = await openai.createCompletion({
// 					model: modelName,
// 					prompt: input,
// 					temperature: 0.2,
// 					max_tokens: 10,
// 				});
// // configuring openai -------------------------------------------------- test
// if (response && response.status === 200) {
//     console.log(response); //.data.choices[0].text)
//     vscode.window.showInformationMessage(
//         `answer: ${response.data.choices[0].text}`
//     );
// } else {
//     console.log(`error: ${response.statusText}`);
// }

function generatePrompt(input: string) {
	// very inefficient, just for testing
	return `Answer this: ${input}`;
}

async function configureOpenAI() {}
