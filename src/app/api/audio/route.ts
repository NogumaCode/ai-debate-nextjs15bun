import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req:NextRequest){
  try{
    const requestBody = await req.json();

    const {text,speaker,threadId} = requestBody

    if(!text || !speaker || !threadId) return NextResponse.json({message:'Bad Request'},{status:400});

    const responseQuery = await axios.post(
      `${process.env.VOICEVOX_URL}/audio_query?speaker=${speaker}&text=${text}`
    )

    const query = responseQuery.data;

    const responseSynthesis = await axios.post(
      `${process.env.VOICEVOX_URL}/synthesis?speaker=${speaker}`,
      query,
      {
        responseType:'arraybuffer'
      }
    );

    const data = Buffer.from(responseSynthesis.data,'binary').toString('base64')

    return NextResponse.json(
      {
        data
      },
      {
        status:200
      }

    )
  }catch(error:unknown){
    const err = error as Error
    const errMessage = err.message ? err.message : 'Internal Sever Error';
    return NextResponse.json({message:errMessage},{status:500})
  }
}
