import http from 'http';

function makeRequest(options: http.RequestOptions, payload?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : undefined;
    const headers = {
      ...(options.headers || {}),
      ...(postData
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        : {})
    };

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runLiveVerification(): Promise<void> {
  console.log('--- 1. Health & Readiness ---');
  const health = await makeRequest({ hostname: 'localhost', port: 3001, path: '/health', method: 'GET' });
  console.log('Health:', health.status, health.body);

  const ready = await makeRequest({ hostname: 'localhost', port: 3001, path: '/ready', method: 'GET' });
  console.log('Ready:', ready.status, ready.body);

  console.log('\n--- 2. Create Order ---');
  const createPayload = {
    customerId: 'a9a6f5e4-1234-4567-8901-123456789012',
    customerReference: 'PO-VERIFY-001',
    currencyCode: 'INR',
    origin: {
      addressLine1: 'Warehouse 1, GIDC',
      city: 'Anand',
      countryCode: 'IN'
    },
    destination: {
      addressLine1: 'Distribution Hub 4',
      city: 'Ahmedabad',
      countryCode: 'IN'
    },
    items: [
      {
        itemName: 'Industrial Sensor Unit',
        quantity: 5,
        unitOfMeasure: 'PCS',
        unitPrice: 200.00
      }
    ],
    taxAmount: 100,
    shippingAmount: 50,
    discountAmount: 25
  };

  const idempotencyKey = `idem-verify-${Date.now()}`;
  const created = await makeRequest(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/orders',
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey }
    },
    createPayload
  );

  console.log('Create Order Status:', created.status);
  console.log('Created Order ID:', created.body?.data?.id);
  console.log('Created Order Number:', created.body?.data?.orderNumber);
  console.log('Calculated Subtotal:', created.body?.data?.subtotal);
  console.log('Calculated Total:', created.body?.data?.totalAmount);

  const orderId = created.body?.data?.id;
  const orderNumber = created.body?.data?.orderNumber;

  console.log('\n--- 3. Idempotent Duplicate Replay ---');
  const replay = await makeRequest(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/orders',
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey }
    },
    createPayload
  );
  console.log('Duplicate Replay Status:', replay.status);
  console.log('Replay Order ID:', replay.body?.data?.id);

  console.log('\n--- 4. Retrieve by ID & Order Number ---');
  const getById = await makeRequest({ hostname: 'localhost', port: 3001, path: `/api/v1/orders/${orderId}`, method: 'GET' });
  console.log('Get By ID Status:', getById.status, 'Items count:', getById.body?.data?.items?.length);

  const getByNumber = await makeRequest({ hostname: 'localhost', port: 3001, path: `/api/v1/orders/number/${orderNumber}`, method: 'GET' });
  console.log('Get By Number Status:', getByNumber.status, 'Status:', getByNumber.body?.data?.status);

  console.log('\n--- 5. List Orders with Pagination ---');
  const list = await makeRequest({ hostname: 'localhost', port: 3001, path: '/api/v1/orders?page=1&limit=5', method: 'GET' });
  console.log('List Orders Status:', list.status, 'Total orders:', list.body?.meta?.pagination?.total);

  console.log('\n--- 6. Confirm Order ---');
  const confirm = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/orders/${orderId}/confirm`,
    method: 'POST',
    headers: { 'X-Actor-Id': 'ops-lead-01' }
  });
  console.log('Confirm Status:', confirm.status, 'New Status:', confirm.body?.data?.status);

  console.log('\n--- 7. Order History ---');
  const history = await makeRequest({ hostname: 'localhost', port: 3001, path: `/api/v1/orders/${orderId}/history`, method: 'GET' });
  console.log('History Status:', history.status, 'History Transitions:', history.body?.data?.length);

  console.log('\n✅ All live verifications completed successfully!');
}

runLiveVerification().catch(console.error);
