import { ethers } from 'ethers'
import config from '../config/index.js'

/**
 * Create a signer for blockchain transactions
 */
export const createSigner = (privateKey = null) => {
  try {
    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)
    const key = privateKey || config.blockchain.privateKey
    
    if (!key || key === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Invalid private key provided')
    }
    
    const wallet = new ethers.Wallet(key, provider)
    return wallet
  } catch (error) {
    throw new Error(`Failed to create signer: ${error.message}`)
  }
}

/**
 * Create oracle signer
 */
export const createOracleSigner = () => {
  return createSigner(config.blockchain.oraclePrivateKey)
}

/**
 * Verify a signed message
 */
export const verifySignature = (message, signature, expectedAddress) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()
  } catch (error) {
    return false
  }
}

/**
 * Sign a message with a private key
 */
export const signMessage = async (message, privateKey = null) => {
  try {
    const signer = createSigner(privateKey)
    return await signer.signMessage(message)
  } catch (error) {
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Generate a random nonce
 */
export const generateNonce = () => {
  return ethers.hexlify(ethers.randomBytes(32))
}

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address) => {
  try {
    ethers.getAddress(address)
    return true
  } catch {
    return false
  }
}

/**
 * Format address for display
 */
export const formatAddress = (address) => {
  if (!address || !isValidAddress(address)) return 'Invalid Address'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Convert Wei to Ether
 */
export const formatEther = (wei) => {
  try {
    return ethers.formatEther(wei)
  } catch (error) {
    return '0'
  }
}

/**
 * Convert Ether to Wei
 */
export const parseEther = (ether) => {
  try {
    return ethers.parseEther(ether.toString())
  } catch (error) {
    return ethers.parseEther('0')
  }
}
