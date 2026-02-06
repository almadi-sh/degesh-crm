const CONTRACT_OWNERS_KEY = "contractOwners";

export type ContractOwnerMap = Record<number, string>;

export const getContractOwnerMap = (): ContractOwnerMap => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(CONTRACT_OWNERS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [Number(key), value]),
    );
  } catch {
    return {};
  }
};

export const setContractOwner = (contractId: number, userId: string) => {
  const next = { ...getContractOwnerMap(), [contractId]: userId };
  localStorage.setItem(CONTRACT_OWNERS_KEY, JSON.stringify(next));
  return next;
};

export const getOwnedContractIds = (ownerMap: ContractOwnerMap, userId: string) =>
  Object.entries(ownerMap)
    .filter(([, ownerId]) => ownerId === userId)
    .map(([contractId]) => Number(contractId));
