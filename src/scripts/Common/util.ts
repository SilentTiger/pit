export const guid = (() => {
  const pool = new Set();
  const generate = () => {
    return Math.floor((1 + Math.random()) * 0x1000000)
      .toString(16)
      .substring(1);
  };
  return () => {
    let current = generate();
    while (pool.has(current)) {
      current = generate();
    }
    pool.add(current);
    return current;
  };
})();
