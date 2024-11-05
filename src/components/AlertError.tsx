'use client'
import { IconAlertTriangle } from "@tabler/icons-react"

export default function AlertError({
    errMessage,
}:{
    errMessage:string
}){
    return(
        <div className="border-red-500 border-2 rounded-md p-4 bg-red-100 w-full max-w-md mx-auto mt-10">
            <div className="flex flex-col text-red-600">
                <IconAlertTriangle className="mr-2"/>
                <span className="break-all">{errMessage}</span>
            </div>
        </div>
    )
}
