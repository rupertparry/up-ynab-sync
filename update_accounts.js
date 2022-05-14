import fetch from 'node-fetch'

const up_key = process.env.UP_KEY
const ynab_key = process.env.YNAB_KEY
const up_account_id = process.env.UP_ACCOUNT_ID
const budget_id = process.env.BUDGET_ID
const ynab_account_id = process.env.YNAB_ACCOUNT_ID

const up_url = "https://api.up.com.au/api/v1"
const ynab_url = "https://api.youneedabudget.com/v1"

const up_headers = {
  'Authorization': `Bearer ${up_key}`,
}

const ynab_headers = {
  'Authorization': `Bearer ${ynab_key}`,
}

const post_headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
}

/* Getting info */

async function get_ynab_accounts() {
  const res = await fetch(`${ynab_url}/budgets/${budget_id}/accounts`, {
    headers: ynab_headers
  })
  const json = await res.json()
  console.log(json)
}

/* Data functions */

async function get_up_transactions() {
  const res = await fetch(`${up_url}/accounts/${up_account_id}/transactions`, {
    headers: up_headers
  })
  const json = await res.json()
  return json.data
}

async function get_ynab_transactions() {
  const res = await fetch(`${ynab_url}/budgets/${budget_id}/transactions`, {
    headers: ynab_headers
  })
  const json = await res.json()
  return json.data.transactions
}

async function add_ynab_transactions(up_transactions) {
  const ynab_transactions = up_transactions.map((u) => {
    return {
      "account_id": ynab_account_id,
      "date": u.attributes.settledAt.split('T')[0],
      "amount": u.attributes.amount.valueInBaseUnits * 10,
      "payee_name": u.attributes.description
    }
  })

  const body = {
    "transactions": ynab_transactions
  }

  const res = await fetch(`${ynab_url}/budgets/${budget_id}/transactions`, {
    method: 'POST',
    headers: {
      ...post_headers,
      ...ynab_headers
    },
    body: JSON.stringify(body)
  })
}

async function run() {
  const up_transactions = await get_up_transactions()
  const ynab_transactions = await get_ynab_transactions()

  const missing_transactions = []
  up_transactions.forEach(async (u) => {
    let match = false
    ynab_transactions.forEach((y) => {
      if (
        u.attributes.amount.valueInBaseUnits + '0' == y.amount &&
        u.attributes.description == y.payee_name
      ) {
        match = true
      }
    })

    if (match == false && u.attributes.status == 'SETTLED') {
      missing_transactions.push(u)
    }
  })

  await add_ynab_transactions(missing_transactions)
}

run()