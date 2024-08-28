
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const ids = params.ids.split(',');

  // Consolidate the selected orders
  const summary = await consolidateSelectedOrders(admin, ids);

  return json({ ids, summary });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};


export default function Orders() {
  const { ids, summary } = useLoaderData();
  console.log('ids', ids);
  console.log('summary', summary);

  const orderCOunt = summary.orderCount;
  const totalAmount = summary.totalAmount;
  const currencyCode = summary.currencyCode;
  const orders = formatOrders(summary.orders);

  return (
    <div>
      <h1>Consolidated Orders</h1>
      <h1>Total Amount: {totalAmount} {currencyCode}</h1>
      <h4>Order Count: {orderCOunt}</h4>
      <h4>Orders Included:</h4>
      <ol>{orders}</ol>      
    </div>
  );
}

async function consolidateSelectedOrders(admin, ids) {

  // Your code to consolidate the selected orders
  var orderSummary = {
    orderCount: 0,
    totalAmount: 0,
    currencyCode: '',
    orders: {}
  };

  for(const id of ids) {
    const id_str = `gid://shopify/Order/${id}`

    const res = await admin.graphql(
      `#graphql
        query GetOrder($id: ID!) {
          order(id: $id) {
            id
            ... on Order {
              name
              createdAt
              currentSubtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                displayName
                defaultAddress {
                  address1
                  address2
                  city
                  province
                  country
                  zip
                }
              }
            }
          }
        }
      `,
      {
        variables: { id: id_str },
      },
    );    
    const { data } = await res.json();

    // Update total amount
    orderSummary.totalAmount += Number(data.order.currentSubtotalPriceSet.shopMoney.amount);
    orderSummary.currencyCode = data.order.currentSubtotalPriceSet.shopMoney.currencyCode;
    orderSummary.orders[orderSummary.orderCount] = data.order;
    orderSummary.orderCount++;
  }

  return orderSummary;
}

function formatOrders(orders) {
  var orderList = [];
  console.log('orders', orders);

  for( const i in orders) {
    const order = orders[i];
    const customer = order.customer;
    var line = `
      Order: ${order.name} 
      Amount: ${order.currentSubtotalPriceSet.shopMoney.amount} ${order.currentSubtotalPriceSet.shopMoney.currencyCode}
      Created At: ${order.createdAt} 
      Customer Name: ${customer?.displayName}
      Address: ${customer?.defaultAddress?.address1} ${customer?.defaultAddress?.address2} ${customer?.defaultAddress?.city} ${customer?.defaultAddress?.province} ${customer?.defaultAddress?.country} ${customer?.defaultAddress?.zip}`;
    orderList.push(<li key={i}>{line}</li>);
  }

//  console.log('orderList', orderList);
  return( orderList );
}

