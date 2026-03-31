declare module "*.stub" {
  function stub(vars: Record<string, string>): string;
  export default stub;
}
