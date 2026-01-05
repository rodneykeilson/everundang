/**
 * Type declarations for the uuid module
 * This provides type definitions until @types/uuid is installed via npm
 */
declare module "uuid" {
  /**
   * Generate a RFC4122 version 4 UUID
   * @returns A RFC4122 v4 UUID string
   */
  export function v4(): string;

  /**
   * Generate a RFC4122 version 1 UUID
   * @returns A RFC4122 v1 UUID string
   */
  export function v1(): string;

  /**
   * Validate a UUID string
   * @param uuid - The string to validate
   * @returns True if the string is a valid UUID
   */
  export function validate(uuid: string): boolean;

  /**
   * Detect the version of a UUID
   * @param uuid - The UUID string
   * @returns The version number or null if invalid
   */
  export function version(uuid: string): number | null;

  /**
   * Parse a UUID string into a byte array
   * @param uuid - The UUID string
   * @returns A Uint8Array of 16 bytes
   */
  export function parse(uuid: string): Uint8Array;

  /**
   * Convert a byte array to a UUID string
   * @param arr - A Uint8Array of 16 bytes
   * @param offset - Optional offset in the array
   * @returns A UUID string
   */
  export function stringify(arr: Uint8Array, offset?: number): string;

  export const NIL: string;
  export const MAX: string;
}
