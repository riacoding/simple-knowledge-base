'use client'

import type { Schema } from '@/amplify/data/resource'
import { Amplify } from 'aws-amplify'
import { FormEvent, useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { v4 } from 'uuid'
import { clsx } from 'clsx'
import amplifyconfig from '@/amplify_outputs.json'
import Link from 'next/link'
import { Loader } from '@aws-amplify/ui-react'

Amplify.configure(amplifyconfig)

type msgObj = { id: string; author: 'me' | 'Bot' | 'BotConfirm' | 'BotCancel' | 'BotWarn'; text: string }

type CommandAction = {
  command: string
  description: string
  function: string
  parameters: string
  prompt: string
}

export default function ChatPage() {
  const client = generateClient<Schema>()
  const [msgText, setMsgText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [msgs, setMsgs] = useState<Array<msgObj>>([
    {
      id: '1',
      author: 'Bot',
      text: 'Hey! How can I help you today?',
    },
  ])
  const [sessionId, setSessionId] = useState<null | string>(null)
  const [action, setAction] = useState<CommandAction | null>(null)
  const [sendCommand, setSendCommand] = useState(false)

  useEffect(() => {
    if (sendCommand) {
      console.log('action', action)
      console.log(`calling ${action?.function} with ${JSON.stringify(action?.parameters, null, 2)}`)
      setAction(null)
      setSendCommand(false)
    }
  }, [sendCommand, action])

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMsgText('')
    setIsLoading(true)
    // Store the initial state change
    const userMessage: msgObj = {
      id: v4(),
      author: 'me',
      text: msgText,
    }

    setMsgs([...msgs, userMessage])

    if (action && sendCommand === false) {
      if (msgText.toLowerCase() === 'yes') {
        setSendCommand(true)
        setIsLoading(false)
        const userMessage: msgObj = {
          id: v4(),
          author: 'BotConfirm',
          text: 'Ok creating now',
        }

        setMsgs([...msgs, userMessage])
        return
      }

      if (msgText.toLowerCase() === 'no') {
        setAction(null)
        setSendCommand(false)
        setIsLoading(false)

        const userMessage: msgObj = {
          id: v4(),
          author: 'BotCancel',
          text: 'Ok cancelled',
        }

        setMsgs([...msgs, userMessage])
        return
      }
    }

    if (action === null) {
      try {
        const { data, errors } = await client.mutations.generateTextFromPrompt(
          {
            text: msgText,
            sessionId,
            prompt: null,
          },
          {
            authMode: 'apiKey',
          }
        )

        if (data) {
          setSessionId(null)

          let response

          try {
            response = JSON.parse(data?.text)
          } catch (error) {
            response = data?.text // If parsing fails, treat it as plain text
          }

          console.log('RESPONSE', response)

          if (response[0].command) {
            const { description, parameters, prompt } = response[0]

            setMsgs((prevMsgs) => [
              ...prevMsgs,
              {
                id: v4(),
                author: 'Bot',
                text: prompt + '\n \nYes to proceed \nNo to Cancel',
              } as msgObj,
            ])
            setAction(response[0])
            console.log('response setAction', response[0])
            setIsLoading(false)
          } else if (Array.isArray(response)) {
            const botResponse = response[0]
            const message = `I didn't understand you can do the following:\n${response.join('\n')}`
            if (botResponse) {
              const botMsg: msgObj = {
                id: v4(),
                author: 'Bot',
                text: message,
              }
              setMsgs((prevMsgs) => [...prevMsgs, botMsg])
              setIsLoading(false)
            }
          } else if (typeof response === 'string') {
            const botMsg: msgObj = {
              id: v4(),
              author: 'BotWarn',
              text: response,
            }
            setMsgs([...msgs, botMsg])
            setIsLoading(false)
          }
        }

        if (errors) {
          console.error('Error generating text from prompt:', errors)
          setMsgs((prevMsgs) => [
            ...prevMsgs,
            {
              id: v4(),
              author: 'Bot',
              text: 'Something went wrong',
            } as msgObj,
          ])
          setSessionId(null)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error('Error generating text from prompt:', error)
        setIsLoading(false)
      }
    }
  }
  return (
    <div className='flex flex-col h-screen'>
      <header className='bg-gray-900 text-white py-4 px-6'>
        <div className='flex justify-between'>
          <h2 className='text-lg font-medium'>riaCoding</h2>
          <Link href='/auth'>manage data</Link>
        </div>
      </header>
      <div className='flex-1 overflow-y-auto p-6 space-y-4'>
        {msgs.map((msg) => (
          <div key={msg.id} className={clsx(`flex ${msg.author === 'me' ? 'justify-end' : 'justify-start'}`)}>
            <div
              className={clsx('px-4 py-2 rounded-lg', {
                'bg-gray-200 text-gray-800 max-w-[70%]': msg.author === 'Bot',
                'bg-blue-500 text-white max-w-[70%]': msg.author === 'me',
                'bg-green-200 text-green-800 max-w-[70%]': msg.author === 'BotConfirm',
                'bg-red-200 text-red-800 max-w-[70%]': msg.author === 'BotCancel',
                'bg-yellow-600 text-yellow-300 max-w-[70%]': msg.author === 'BotWarn',
              })}
            >
              <p className='whitespace-pre-wrap'>{msg.text}</p>
            </div>
          </div>
        ))}
        <div className={clsx('justify-start', isLoading ? 'block' : 'hidden')}>
          <Loader style={{ stroke: '#3B82FC' }} size='large' />
        </div>
      </div>
      <form onSubmit={handleFormSubmit} className='bg-gray-100 py-4 px-6 flex items-center'>
        <input
          className='flex-1 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='Type your message...'
          type='text'
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
        />
        <button type='submit' className='ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600'>
          Send
        </button>
      </form>
    </div>
  )
}
