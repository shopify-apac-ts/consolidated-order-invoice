import {
  reactExtension,
  useApi,
  AdminPrintAction,
  Banner,
  BlockStack,
} from "@shopify/ui-extensions-react/admin";
import { useEffect, useState } from "react";

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = "admin.order-index.selection-print-action.render";

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const {i18n, data} = useApi(TARGET);
  const [src, setSrc] = useState(null);
  // data has information about the resource to be printed.
  // console.log({ data });

//  const orderSummary = consolidateSelectedOrders({ data });
  const orderIds = getOrderIds({ data });

  /* 
    This template fetches static documents from the CDN to demonstrate printing.
    However, when building your extension, you should update the src document
    to match the resource that the user is printing. You can do this by getting the 
    resource id from the data API and using it to create a URL with a path to your app 
    that shows the correct document. For example, you might use a URL parameter to 
    render an invoice for a specific order.
    
    `/print/invoice&orderId=${data.selected[0].id}`
  */
  useEffect(() => {
    setSrc(`/orders/${orderIds}`);
  }, [orderIds]);

  return (
    /* 
      The AdminPrintAction component provides an API for setting the src of the Print Action extension wrapper.
      The document you set as src will be displayed as a print preview.
      When the user clicks the Print button, the browser will print that document.
      HTML, PDFs and images are supported.
  
      The `src` prop can be a...
        - Full URL: https://cdn.shopify.com/static/extensibility/print-example/document1.html
        - Relative path in your app: print-example/document1.html or /print-example/document1.html 
        - Custom app: protocol: app:print (https://shopify.dev/docs/api/admin-extensions#custom-protocols)
    */
    <AdminPrintAction src={src}>
      <BlockStack blockGap="base">
        <Banner tone="warning" title={i18n.translate('warningTitle')}>
          {i18n.translate('warningBody')}
        </Banner>
      </BlockStack>
    </AdminPrintAction>
  );
}

function getOrderIds(data) {

  var orderIdsStr = '';

  const ids = data.data.selected;
  for(const i of ids) {
    if(orderIdsStr.length > 0) { orderIdsStr += ','; }
    const id_str = i.id;
//    console.log('id_str', id_str);
    const id = id_str.substring(id_str.lastIndexOf('/') + 1);
    console.log('id', id);
    orderIdsStr += id;
  }

  return orderIdsStr;
}



async function consolidateSelectedOrders(selectedOrderIds) {

  // Your code to consolidate the selected orders
  var orderSummary = {
    orderCount: 0,
    totalAmount: 0,
    currencyCode: '',
    orders: {}
  };

  const ids = selectedOrderIds.data.selected;
  for(const i of ids) {
    const id = i.id;
//    console.log('order id', id);

    const res = await fetch('shopify:admin/api/graphql.json', {
      method: 'POST',
      body: JSON.stringify({
        query: `
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
              }
            }
          }
        `,
        variables: { id },
      }),
    });
    const { data } = await res.json();
//    console.log('order data', data.order);

    // Update total amount
    orderSummary.totalAmount += Number(data.order.currentSubtotalPriceSet.shopMoney.amount);
    orderSummary.currencyCode = data.order.currentSubtotalPriceSet.shopMoney.currencyCode;
    orderSummary.orders[orderSummary.orderCount] = data.order;
    orderSummary.orderCount++;
  }
//  console.log('orderSummary', orderSummary);
  return orderSummary;
}

