export function request(ctx) {
  console.log('request ctx', ctx)
  const commands = ['Create an invoice', 'Create a Gallery', 'Add a landing page']
  const prompt = `
  You are a helpful assistant. Only respond with JSON, as specified, using one of the following commands ${commands}
  
  JSON Response Format:
  If the input matches a command, respond with:
  [{
    "command": "command_name",
    "description": "command_description",
    "function": command_function",
    "parameters": { "param1": "value", "param2": "value" }
    "prompt":"command_prompt"
  }]
  
  Please respond only in JSON, without additional text. if none of the commands match send a list of available commands ${commands}
  Question: ${ctx.args.text}
  `

  return {
    resourcePath: '/retrieveAndGenerate',
    method: 'POST',
    params: {
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        input: {
          text: prompt,
        },
        retrieveAndGenerateConfiguration: {
          externalSourcesConfiguration: {
            modelArn: ctx.env.bedrockArn,
            promptTemplate: {
              textPromptTemplate: ctx.args.prompt ?? null,
            },
            sources: [
              {
                s3Location: {
                  uri: ctx.env.bucketUri,
                },
                sourceType: 'S3',
              },
            ],
          },
          type: 'EXTERNAL_SOURCES',
        },
        sessionId: ctx.args.sessionId ?? null,
      },
    },
  }
}
export function response(ctx) {
  console.log('repsonse ctx', ctx)
  const parsedBody = JSON.parse(ctx.result.body)
  const res = {
    text: parsedBody.citations[0].generatedResponsePart.textResponsePart.text,
    sessionId: parsedBody.sessionId,
  }
  console.log(res)
  return res
}
