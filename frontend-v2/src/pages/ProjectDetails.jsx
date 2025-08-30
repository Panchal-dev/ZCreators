import React from 'react'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'

const ProjectDetails = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Project Details</h1>
        <p className="text-muted-foreground">
          Project details view coming soon...
        </p>
      </Card>
    </motion.div>
  )
}

export default ProjectDetails
