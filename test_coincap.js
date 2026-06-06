async function test() {
  const end = Date.now();
  const start = end - 24 * 60 * 60 * 1000;
  const res = await fetch(`https://api.coincap.io/v2/assets/bitcoin/history?interval=m15&start=${start}&end=${end}`);
  const data = await res.json();
  console.log(data.data ? data.data.length : data);
}
test();
