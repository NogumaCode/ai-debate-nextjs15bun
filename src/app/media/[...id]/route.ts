
import { NextRequest,NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest,
    { params }: { params: { id: string[] } }){
    try{
        //params=['threadId','0.mp3'] → filePath = 'mediaディレクトリまでのパス/media/threadId/0.mp3'
        const filePath = path.join(process.cwd(), 'media', ...params.id);

        if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            const mimeType = 'audio/mpeg'; // mp3のMIMEタイプ

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': mimeType,
                },
            });
        }
        return NextResponse.json({ message: 'Bad Request.'}, { status: 400});

    }catch(error:unknown){
      const err = error as Error
        const errMessage = err.message ?  err.message : `Internal Server Error.`;
        return NextResponse.json({ message: errMessage}, { status: 500});
    }
}
