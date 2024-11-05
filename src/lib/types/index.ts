export type DebatingForm = {
  topic:''
  start:'admit'|'deny'
}
export type DebateData = {
  threadId	: string
  messages	: string[]
}
export type OpenAiResponseData = {
  threadId:string
  data:string //Assistantからの返答メッセージ
}
export type OpenAiPostResponseData = {
  admit:OpenAiResponseData
  deny:OpenAiResponseData
}
