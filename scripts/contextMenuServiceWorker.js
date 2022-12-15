const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0].id;

      chrome.tabs.sendMessage(
        activeTab,
        { message: 'inject', content },
        (response) => {
            console.log(response);
          if (response?.status === 'failed') {
            console.log('injection failed.');
          }
        }
      );
    });
  };

const generate = async (prompt) => {

  console.log(`Generate: ${prompt}`);

  // Get your API key from storage
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 750,
      temperature: 0.5,
    }),
  });

  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {
    const { selectionText } = info;
    const basePromptPrefix = `
        Person wants to write about ${selectionText}. Write a tweet about it.
        `;

    const baseCompletion = await generate(`${basePromptPrefix}`);

    const secondPrompt = `
      Person wrote a tweet ${baseCompletion.text}. Write 3 alternative tweets. 1. more professional, 2. more playful, 3. same vibe as original.
      Use different hashtags for the 3 tweets. Use a maximum of 2 hashtags per tweet. Each tweet has at least 140 characters.
    `;

    const secondCompletion = await generate(`${secondPrompt}`);

    console.log(`RESULT: ${secondCompletion.text}`);

    sendMessage(secondCompletion.text);
  } catch (error) {
    console.log(error);
    sendMessage(error.toString());
  }
};

// Don't touch this
chrome.contextMenus.create({
  id: "context-run",
  title: "Generate 3 Tweets",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
