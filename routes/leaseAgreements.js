const express = require('express')
const router = express.Router()
const LeaseAgreement = require('../models/leaseAgreement')
const kafkaSend = require('../service/kafka-producer');

// Getting all subscribers
router.get('/', async (req, res) => {
  try {
    const leaseAgreements = await LeaseAgreement.find()
    res.json(leaseAgreements)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Creating one leaseAgreement
router.post('/', async (req, res) => {
  const leaseAgreement = new LeaseAgreement({
    term: req.body.term,
    termLength: req.body.termLength
  })

  try {
    const newLeaseAgreement = await leaseAgreement.save()
    const {_id} = newLeaseAgreement
    let queue = {
      entity: 'LeaseAgreement',
      id: _id,
      before: null,
      after: newLeaseAgreement
    }
    kafkaSend.sendRecord(queue, function(err, data){
      if(err){
        console.log('error: ', err)
      }
      else{
        res.status(201).json(newLeaseAgreement)
      }
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Getting one leaseAgreement
router.get('/:id', getLeaseAgreement, (req, res) => {
  res.json(res.leaseAgreement)
})

// Updating one leaseAgreement
router.put('/:id', getLeaseAgreement, async (req, res) => {
  if (req.body.term != null) {
    res.leaseAgreement.term = req.body.term
  }

  if (req.body.termLength != null) {
    res.leaseAgreement.termLength = req.body.termLength
  }
  try {
    const {_id} = res.leaseAgreement
    let queue = {
      entity: 'LeaseAgreement',
      id: _id,
      before: res.leaseAgreement
    }
    const updatedLeaseAgreement = await res.leaseAgreement.save()
    Object.assign(queue, {after: updatedLeaseAgreement})
    kafkaSend.sendRecord(queue, function(err, data){
      if(err){
        console.log('error: ', err)
      }
      else{
        res.json(updatedLeaseAgreement)
      }
    })
  } catch(err) {
    res.status(400).json({ message: err.message })
  }

})
// Deleting one leaseAgreement
router.delete('/:id', getLeaseAgreement, async (req, res) => {
  try {
    const leaseAgreement = await res.leaseAgreement.remove()
    const {_id} = leaseAgreement
    let queue = {
      entity: 'LeaseAgreement',
      id: _id,
      before: leaseAgreement,
      after: null
    }
    kafkaSend.sendRecord(queue, function(err, data){
      if(err){
        console.log('error: ', err)
      }
      else{
        res.json({ message: 'Deleted This LeaseAgreement' })
      }
    })
  } catch(err) {
    res.status(500).json({ message: err.message })
  }
})

// Middleware function for gettig leaseAgreement object by ID
async function getLeaseAgreement(req, res, next) {
  try {
    leaseAgreement = await LeaseAgreement.findById(req.params.id)
    if (leaseAgreement == null) {
      return res.status(404).json({ message: 'Cant find leaseAgreement'})
    }
  } catch(err){
    return res.status(500).json({ message: err.message })
  }
  
  res.leaseAgreement = leaseAgreement
  next()
}

module.exports = router 