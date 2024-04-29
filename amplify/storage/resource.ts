import { defineStorage } from '@aws-amplify/backend'

export const storage = defineStorage({
	name: 'skillsetBucket',
	access: (allow) => ({
		'skillset/*': [
			allow.authenticated.to(['read', 'write', 'delete']),
			allow.guest.to(['write', 'delete', 'get', 'list']),
		],
	}),
})
