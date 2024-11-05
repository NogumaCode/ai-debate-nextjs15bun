// import { deleteThreads } from "@/lib/functions/threadFc";
import prisma from "@/lib/prismadb";
import { checkRunStateAndGetMessage, createMessage, createThread, runAssistant } from "@/lib/openai";
import { NextResponse } from "next/server";
const assistantId = process.env.ASSISTANT_ID as string;

// export async function GET(request:Request){
//     try{
//         await deleteThreads();
//         return NextResponse.json({ message: 'success'}, { status: 200});
//     }catch(err:any){
//         const errMessage = err.message ?  err.message : `Internal Server Error.`;
//         return NextResponse.json({ message: errMessage}, { status: 500});
//     }
// }

export async function POST(request: Request){
    try{
        //////////
        //◆【request】
        //topic
        const requestBody = await request.json();
        // let {topic} = requestBody;
        const {topic} = requestBody;
        if (!topic) {
          return NextResponse.json({ message: "Bad Request." }, { status: 400 });
        }

        //////////
        //◆【非同期でゴミ掃除(一定期間経過したスレッドを削除)】
        // deleteThreads().catch((error:unknown)=>{
        //   const err = error as Error;
        //   console.log(err.message)
        // }
        // );


        //////////
        //◆【threadの作成】
        //■[ stance:admit ]
        let createThreadResult = await createThread();
        if(!createThreadResult.result)throw new Error(createThreadResult.message);
        const admitThreadId = createThreadResult.threadId;
        await prisma.thread.create({
            data:{
                threadId:admitThreadId
            }
        });
        //■[ stance:deny ]
        createThreadResult = await createThread();
        if(!createThreadResult.result)throw new Error(createThreadResult.message);
        const denyThreadId = createThreadResult.threadId;
        await prisma.thread.create({
            data:{
                threadId:denyThreadId
            }
        });


        //////////
        //◆【ディベートを開始するためのMessageの作成】
        //■[ stance:admit ]
        let createMessageResult = await createMessage({
            threadId:admitThreadId,
            content:`指示X：「${topic}」に対して、賛成の立場を取って下さい。`
        });
        if(!createMessageResult.result)throw new Error(createMessageResult.message);
        // const admitMessageId = createMessageResult.messageId;

        //■[ stance:deny ]
        createMessageResult = await createMessage({
            threadId:denyThreadId,
            content:`指示X：「${topic}」に対して、反対の立場を取って下さい。`
        });
        if (!createMessageResult.result) throw new Error(createMessageResult.message);
        // const denyMessageId = createMessageResult.messageId;

        ///////////
        //◆【Assistantの実行】
        //■[ stance:admit ]
        let runResult = await runAssistant({
            threadId:admitThreadId,
            assistantId,
        });
        if(!runResult.result)throw new Error(runResult.message);
        const admitRunId = runResult.runId;
        
        //■[ stance:deny ]
        runResult = await runAssistant({
            threadId:denyThreadId,
            assistantId
        });
        if(!runResult.result)throw new Error(runResult.message);
        const denyRunId = runResult.runId;

        //////////
        //◆【待機】
        let admitMessage:null|string = null;
        let denyMessage:null|string = null;
        for(let i=0; i<100; i++){
            await new Promise((resolve) => setTimeout(resolve, 3000))
            //■[ stance:admit ]
            if(!admitMessage){
                const result = await checkRunStateAndGetMessage({threadId:admitThreadId, runId:admitRunId});
                if(!result.result)throw new Error(result.message);
                admitMessage = result.data;
            }
            //■[ stance:deny ]
            if(!denyMessage){
                const result = await checkRunStateAndGetMessage({threadId:denyThreadId, runId:denyRunId});
                if(!result.result)throw new Error(result.message);
                denyMessage = result.data;
            }
            if(admitMessage && denyMessage)break;
        }

        //////////
        //◆【return】
        return NextResponse.json(
            {
                admit:{
                    threadId:admitThreadId,
                    data:admitMessage,
                },
                deny:{
                    threadId:denyThreadId,
                    data:denyMessage,
                }
            },
            {
                status: 200
            }
        );

    }catch(error:unknown){
      const err = error as Error
        const errMessage = err.message ?  err.message : `Internal Server Error.`;
        return NextResponse.json({ message: errMessage}, { status: 500});
    }
}


export async function PUT(request: Request){
    try{
        //////////
        //◆【request】
        //topic
        const requestBody = await request.json();
        const {threadId,content} = requestBody;
        if(!threadId || !content)return NextResponse.json({ message: 'Bad Request.'}, { status: 400});


        //////////
        //◆【Messageの作成】
        const createMessageResult = await createMessage({
            //contantが賛成意見なら stance-denyのthreadId、contantが反対意見なら stance-admitのthreadId
            threadId,
            content,
        });
        if(!createMessageResult.result)throw new Error(createMessageResult.message);
        // const messageId = createMessageResult.messageId;


        ///////////
        //◆【Assistantの実行】
        //■[ stance:admit ]
        const runResult = await runAssistant({
            threadId:threadId,
            assistantId,
        });
        if(!runResult.result)throw new Error(runResult.message);
        const runId = runResult.runId;

        //////////
        //◆【待機】
        let message:null|string = null;
        for(let i=0; i<100; i++){
            await new Promise((resolve) => setTimeout(resolve, 3000))
            if(!message){
                const result = await checkRunStateAndGetMessage({threadId:threadId, runId:runId});
                if(!result.result)throw new Error(result.message);
                message = result.data;
            }
            if(message)break;
        }

        //////////
        //◆【return】
        return NextResponse.json(
            {
                threadId:threadId,
                data:message,
            },
            {
                status: 200
            }
        );

    }catch(error:unknown){
      const err = error as Error
        const errMessage = err.message ?  err.message : `Internal Server Error.`;
        return NextResponse.json({ message: errMessage}, { status: 500});
    }
}
