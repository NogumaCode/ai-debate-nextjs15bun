
import { deleteThread } from "@/lib/openai";
import prisma from "@/lib/prismadb";
import * as fs from 'fs';

export const deleteThreads = async() => {
    //////////
    //◆【ゴミ掃除：15分以上経過しているthreadを削除】
    const targetThreads = await prisma.thread.findMany({
        where:{
            createdAt: {
                lt: new Date(Date.now() - 1000 * 60 * 15)
            }
        }
    });
    for(let i=0; i<targetThreads.length; i++){
        const targetThread = targetThreads[i];
        //////////
        //◆【transaction】
        await prisma.$transaction(async (prismaT) => {
            //対象のDB[Thread]削除
            await prismaT.thread.delete({
                where:{id:targetThread.id}
            });

            //対象のローカルディレクトリを削除
            const directoryPath = `./media/${targetThread.threadId}`; // ファイルを検索するディレクトリのパス
            if (fs.existsSync(directoryPath)){
                fs.rmdirSync(directoryPath, { recursive: true });
            }
            //OpenAIPlatformから対象のthreadを削除
            const {result,message} = await deleteThread({threadId:targetThread.threadId});
            if(!result)throw new Error(message);
        },
        {
            maxWait: 10000, // default: 2000
            timeout: 250000, // default: 5000,
        }).catch(async (error:unknown)=>{
          const err = error as Error
            const errMessage = `Failed transaction.${err.message}`;
            throw new Error(errMessage);
        });
    }
}
