export async function handler(): Promise<any> {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hello: 'world' }),
  };
}