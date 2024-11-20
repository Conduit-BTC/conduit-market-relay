import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { schema } from './graphql/schema.ts'

const yoga = createYoga({ schema })

const gqlServer = createServer(yoga)

gqlServer.listen(4000, () => {
  console.info('GraphQL Server is running on http://localhost:4000/graphql')
})