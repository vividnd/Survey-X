// Suppress wallet extension conflicts and other cosmetic errors
export function suppressWalletErrors() {
  // Suppress wallet extension conflicts
  const originalError = console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    
    // Suppress common wallet extension conflicts
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot set property ethereum') ||
      message.includes('Cannot redefine property: isZerion') ||
      message.includes('Failed to assign ethereum proxy') ||
      message.includes('Invalid property descriptor') ||
      message.includes('Could not establish connection') ||
      message.includes('Could not attach Phantom event listeners') ||
      message.includes('Could not remove Phantom event listeners')
    ) {
      return // Suppress these errors
    }
    
    // Log other errors normally
    originalError.apply(console, args)
  }

  // Suppress wallet extension warnings
  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    
    // Suppress common wallet extension warnings
    if (
      message.includes('MetaMask encountered an error') ||
      message.includes('Backpack couldn\'t override') ||
      message.includes('Nightly: Overwrites EVM default provider') ||
      message.includes('Unable to redefine window.ethereum')
    ) {
      return // Suppress these warnings
    }
    
    // Log other warnings normally
    originalWarn.apply(console, args)
  }
}

// Auto-suppress errors on import
if (typeof window !== 'undefined') {
  suppressWalletErrors()
}
