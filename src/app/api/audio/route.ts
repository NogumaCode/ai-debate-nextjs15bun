import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req:NextRequest){
  try{
    const { text, speaker, threadId } = await req.json()
    if(!text || !speaker || !threadId)return NextResponse.json({ message: 'Bad Request.'}, { status: 400});

    const responseQuery = await axios.post(
      `${process.env.VOICEVOX_URL}/audio_query?speaker=${speaker}&text=${text}`
    )

    const query = responseQuery.data;
    query.speedScale = 1.15;

    const responseAudio  = await axios.post(
      `${process.env.VOICEVOX_URL}/synthesis?speaker=${speaker}`,
      query,
      {
        responseType:'arraybuffer'
      }
    );

    const bufferData = Buffer.from(responseAudio.data)

    //◆【mp3ファイルの書き込み】
    //■threadIdのディレクトリが無ければ作成
    let fileName = '0.mp3';
    const directoryPath = `./media/${threadId}`; // ファイルを検索するディレクトリのパス
    if (!fs.existsSync(directoryPath)){
        fs.mkdirSync(directoryPath);
    }else{
        // ディレクトリ内の全ファイルを取得
        const files = fs.readdirSync(directoryPath);
        // .mp3ファイルの数を数える
        const mp3FileCount = files.filter(file => path.extname(file).toLowerCase() === '.mp3').length;
        //fileNameの更新
        fileName = `${mp3FileCount}.mp3`;
    }
    //■書き込み
    const mp3LocalPath = `${directoryPath}/${fileName}`;
    fs.writeFileSync(mp3LocalPath, bufferData);


    return NextResponse.json(
      {
        mp3PublicPath:`${process.env.NEXT_PUBLIC_URL}/media/${threadId}/${fileName}`
      },
      {
        status:200
      }
    );
  }catch(error:unknown){
    const err = error as Error
    const errMessage = err.message ? err.message : 'Internal Sever Error';
    return NextResponse.json({message:errMessage},{status:500})
  }
}
