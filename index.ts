// deno-lint-ignore-file no-explicit-any

import {
    bold,
    gray,
    italic,
    magenta,
    white,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";

import {
    BedrockAgentRuntimeClient,
    InvokeFlowCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const debug: boolean = Deno.env.get("DEBUG")?.toLowerCase() === "true";

// Configure the AWS client
const client = new BedrockAgentRuntimeClient({
    region: Deno.env.get("AWS_REGION") || "us-east-1",
    credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
    },
});

async function invokeFlow(
    flowIdentifier: string | undefined,
    flowAliasIdentifier: string | undefined,
    inputs: any[],
) {
    const command = new InvokeFlowCommand({
        flowIdentifier,
        flowAliasIdentifier,
        inputs,
    });

    const startTime = Date.now();
    try {
        let flowResponse: any = {};
        const response = await client.send(command);
        const endTime = Date.now();

        if (response && response.responseStream) {
            for await (const chunkEvent of response.responseStream) {
                const { flowOutputEvent, flowCompletionEvent } = chunkEvent;

                if (flowOutputEvent) {
                    flowResponse = { ...flowResponse, ...flowOutputEvent };

                    console.log(
                        `\n${gray("Answer")}: ${
                            bold(white(flowResponse?.content?.document))
                        }\n`,
                    );

                    if (debug) {
                        console.log(
                            magenta(
                                `Flow execution time: ${
                                    ((endTime - startTime) / 1000).toFixed(3)
                                } secs`,
                            ),
                        );
                    }
                } else if (flowCompletionEvent) {
                    if (
                        debug &&
                        flowCompletionEvent.completionReason != "SUCCESS"
                    ) {
                        flowResponse = {
                            ...flowResponse,
                            ...flowCompletionEvent,
                        };
                        console.log(
                            "Flow completion event:",
                            flowCompletionEvent,
                        );
                    }
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
const flowIdentifier: string | undefined = Deno.env.get(
    "AWS_BEDROCK_FLOW_IDENTIFIER",
);
const flowAliasIdentifier: string | undefined = Deno.env.get(
    "AWS_BEDROCK_FLOW_ALIAS_IDENTIFIER",
);

console.log("Welcome to the 🌈 Color Oracle");

let counter: number = 1;

while (true) {
    console.log(italic("\nName anything and I'll tell you its color."));
    const input = prompt(magenta(`${counter++}: `));

    const inputs = [
        {
            content: { document: `${input}` },
            nodeName: "FlowInputNode",
            nodeOutputName: "document",
        },
    ];

    await invokeFlow(flowIdentifier, flowAliasIdentifier, inputs);
}
