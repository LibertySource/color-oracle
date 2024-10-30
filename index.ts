// index.ts

import {
    BedrockAgentRuntimeClient,
    InvokeFlowCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

// Configure the AWS client
const client = new BedrockAgentRuntimeClient({
    region: Deno.env.get("AWS_REGION") || "us-east-1",
    credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
    },
});

async function invokeFlow(
    flowIdentifier: string,
    flowAliasIdentifier: string,
    inputs: any[],
) {
    const command = new InvokeFlowCommand({
        flowIdentifier,
        flowAliasIdentifier,
        inputs,
    });

    try {
        let flowResponse = {};
        const response = await client.send(command);

        if (response && response.responseStream) {
            for await (const chunkEvent of response.responseStream) {
                const { flowOutputEvent, flowCompletionEvent } = chunkEvent;

                if (flowOutputEvent) {
                    flowResponse = { ...flowResponse, ...flowOutputEvent };
                    
                    console.log();
                    console.log(
                        `Answer: ${flowResponse.content.document}`,
                    );
                    console.log();
                } else if (flowCompletionEvent) {
                    // uncomment for debug info
                    // flowResponse = { ...flowResponse, ...flowCompletionEvent };
                    // console.log("Flow completion event:", flowCompletionEvent);
                }
            }
        }
        return response;
    } catch (error) {
        console.error("Error invoking flow:", error);
        throw error;
    }
}

// Example usage
const flowIdentifier = Deno.env.get("AWS_BEDROCK_FLOW_IDENTIFIER");
const flowAliasIdentifier = Deno.env.get("AWS_BEDROCK_FLOW_ALIAS_IDENTIFIER");

console.log("Name any object and I'll tell you its color.");
const input = prompt(": ");

const inputs = [
    {
        content: { document: `${input}` },
        nodeName: "FlowInputNode",
        nodeOutputName: "document",
    },
];

invokeFlow(flowIdentifier, flowAliasIdentifier, inputs);
