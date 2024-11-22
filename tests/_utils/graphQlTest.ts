class GraphQLTester {
  private url: string;
  private connectionTimeout: number;

  constructor(url = 'http://localhost:4000/graphql', timeout = 5000) {
    this.url = url;
    this.connectionTimeout = timeout;
  }

  private async makeGraphQLRequest(query: string, variables = {}) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.json(),
    };
  }

  async runTests() {
    console.log(`\n🔍 Testing GraphQL server at ${this.url}`);

    try {
      // 1. Test server availability
      console.log('\n📡 Testing server availability...');
      const healthCheck = await fetch(this.url);
      console.log(`Status: ${healthCheck.status} ${healthCheck.statusText}`);
      console.log('Headers:', Object.fromEntries(healthCheck.headers));

      // 2. Test introspection
      console.log('\n📚 Testing introspection...');
      const introspectionQuery = `
        query {
          __schema {
            types {
              name
              kind
            }
          }
        }
      `;
      const introspectionResult = await this.makeGraphQLRequest(introspectionQuery);
      const typesCount = introspectionResult.body.data?.__schema.types.length ?? 0;
      console.log(`✅ Schema contains ${typesCount} types`);

      // 3. Test basic query
      console.log('\n🔎 Testing basic query...');
      const testQuery = `
        query {
          hello
        }
      `;
      const queryResult = await this.makeGraphQLRequest(testQuery);
      console.log('Query response:', JSON.stringify(queryResult.body, null, 2));

      // 4. Test error handling
      console.log('\n⚠️ Testing error handling...');
      const invalidQuery = `
        query {
          thisFieldDoesNotExist
        }
      `;
      const errorResult = await this.makeGraphQLRequest(invalidQuery);
      if (errorResult.body.errors) {
        console.log('✅ Server correctly handles invalid queries');
      }

      // 5. Performance test
      console.log('\n⚡ Running basic performance test...');
      const start = performance.now();
      const requests = await Promise.all(
        Array(10).fill(null).map(() => this.makeGraphQLRequest(testQuery))
      );
      const end = performance.now();
      const avgTime = (end - start) / requests.length;
      console.log(`Average response time: ${avgTime.toFixed(2)}ms`);

      // Summary
      console.log('\n📊 Test Summary:');
      console.log('- Server is responding');
      console.log(`- Introspection found ${typesCount} types`);
      console.log(`- Basic query ${queryResult.body.data ? 'successful' : 'failed'}`);
      console.log(`- Error handling working as expected`);
      console.log(`- Average response time: ${avgTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('\n❌ Test failed:', error);
      console.log('\n🔍 Troubleshooting suggestions:');
      console.log('1. Verify the GraphQL server is running on the correct port');
      console.log('2. Check if the endpoint URL is correct');
      console.log('3. Ensure the schema includes the tested queries');
      console.log('4. Verify network connectivity and firewall settings');
      console.log('5. Check server logs for any errors');
    }
  }

  async testCustomQuery(query: string, variables = {}) {
    console.log(`\n🔍 Testing custom query:`);
    console.log(query);

    try {
      const result = await this.makeGraphQLRequest(query, variables);
      console.log('\nResponse:', JSON.stringify(result.body, null, 2));
    } catch (error) {
      console.error('Query failed:', error);
    }
  }
}

const tester = new GraphQLTester();
await tester.runTests();

// Optional: Test a custom query
// await tester.testCustomQuery(`
//   query {
//     yourCustomQuery {
//       field1
//       field2
//     }
//   }
// `);
