const ChainOfCustody = artifacts.require('./ChainOfCustody.sol')
require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('ChainOfCustody', ([admin, police, lawyer, analyst, executive, unauthorized]) => {
  let chainOfCustody

  before(async () => {
    chainOfCustody = await ChainOfCustody.deployed()
    
    // Add authorized users
    await chainOfCustody.addAuthorizedUser(police)
    await chainOfCustody.addAuthorizedUser(lawyer)
    await chainOfCustody.addAuthorizedUser(analyst)
    await chainOfCustody.addAuthorizedUser(executive)
  })

  describe('deployment', async () => {
    it('deploys successfully', async () => {
      const address = await chainOfCustody.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('has correct admin', async () => {
      const contractAdmin = await chainOfCustody.admin()
      assert.equal(contractAdmin, admin)
    })

    it('authorized users are set correctly', async () => {
      assert.isTrue(await chainOfCustody.authorizedUsers(police))
      assert.isTrue(await chainOfCustody.authorizedUsers(lawyer))
      assert.isTrue(await chainOfCustody.authorizedUsers(analyst))
      assert.isTrue(await chainOfCustody.authorizedUsers(executive))
      assert.isFalse(await chainOfCustody.authorizedUsers(unauthorized))
    })
  })

  describe('evidence management', async () => {
    const caseId = 'c84e339e-5c0f-4f4d-84c5-bb79a3c1d2a2'
    const itemId = '1004820154'
    let result

    describe('adding evidence', async () => {
      it('allows authorized user to add evidence', async () => {
        result = await chainOfCustody.addEvidence(caseId, itemId, { from: police })
        
        const event = result.logs[0].args
        assert.equal(event.caseId, caseId)
        assert.equal(event.itemId.toString(), itemId)
        assert.equal(event.creator, police)
      })

      it('prevents unauthorized user from adding evidence', async () => {
        await chainOfCustody.addEvidence(caseId, '2222222222', { from: unauthorized })
          .should.be.rejected
      })

      it('prevents adding duplicate evidence', async () => {
        await chainOfCustody.addEvidence(caseId, itemId, { from: police })
          .should.be.rejected
      })

      it('requires valid case ID', async () => {
        await chainOfCustody.addEvidence('', '3333333333', { from: police })
          .should.be.rejected
      })
    })

    describe('checking out evidence', async () => {
      it('allows authorized user to checkout evidence', async () => {
        result = await chainOfCustody.checkoutEvidence(itemId, { from: analyst })
        
        const evidence = await chainOfCustody.evidenceItems(itemId)
        assert.equal(evidence.state.toString(), '1') // CHECKEDOUT
      })

      it('prevents unauthorized user from checking out evidence', async () => {
        await chainOfCustody.checkoutEvidence(itemId, { from: unauthorized })
          .should.be.rejected
      })

      it('prevents checking out already checked out evidence', async () => {
        await chainOfCustody.checkoutEvidence(itemId, { from: analyst })
          .should.be.rejected
      })

      it('prevents checking out non-existent evidence', async () => {
        await chainOfCustody.checkoutEvidence('9999999999', { from: analyst })
          .should.be.rejected
      })
    })

    describe('checking in evidence', async () => {
      it('allows authorized user to checkin evidence', async () => {
        result = await chainOfCustody.checkinEvidence(itemId, { from: analyst })
        
        const evidence = await chainOfCustody.evidenceItems(itemId)
        assert.equal(evidence.state.toString(), '0') // CHECKEDIN
      })

      it('prevents unauthorized user from checking in evidence', async () => {
        await chainOfCustody.checkinEvidence(itemId, { from: unauthorized })
          .should.be.rejected
      })

      it('prevents checking in already checked in evidence', async () => {
        await chainOfCustody.checkinEvidence(itemId, { from: analyst })
          .should.be.rejected
      })

      it('prevents checking in non-existent evidence', async () => {
        await chainOfCustody.checkinEvidence('9999999999', { from: analyst })
          .should.be.rejected
      })
    })

    describe('removing evidence', async () => {
      it('allows creator to remove evidence', async () => {
        result = await chainOfCustody.removeEvidence(
          itemId,
          1, // DISPOSED
          '',
          { from: police }
        )
        
        const evidence = await chainOfCustody.evidenceItems(itemId)
        assert.equal(evidence.state.toString(), '2') // REMOVED
        assert.equal(evidence.removalReason.toString(), '1') // DISPOSED
      })

      it('prevents non-creator from removing evidence', async () => {
        const newItemId = '5555555555'
        await chainOfCustody.addEvidence(caseId, newItemId, { from: police })
        
        await chainOfCustody.removeEvidence(
          newItemId,
          1, // DISPOSED
          '',
          { from: analyst }
        ).should.be.rejected
      })

      it('requires valid removal reason', async () => {
        const newItemId = '6666666666'
        await chainOfCustody.addEvidence(caseId, newItemId, { from: police })
        
        await chainOfCustody.removeEvidence(
          newItemId,
          0, // NONE
          '',
          { from: police }
        ).should.be.rejected
      })

      it('requires owner info when released', async () => {
        const newItemId = '7777777777'
        await chainOfCustody.addEvidence(caseId, newItemId, { from: police })
        
        await chainOfCustody.removeEvidence(
          newItemId,
          3, // RELEASED
          '', // Missing owner info
          { from: police }
        ).should.be.rejected
      })
    })

    describe('viewing evidence history', async () => {
      before(async () => {
        // Add new evidence and perform multiple actions
        const newItemId = '8888888888'
        await chainOfCustody.addEvidence(caseId, newItemId, { from: police })
        await chainOfCustody.checkoutEvidence(newItemId, { from: analyst })
        await chainOfCustody.checkinEvidence(newItemId, { from: analyst })
        await chainOfCustody.removeEvidence(newItemId, 1, '', { from: police })
      })

      it('returns complete history for an item', async () => {
        const [caseIds, itemIds, states, actors, timestamps, reasons, releasedTos] = 
          await chainOfCustody.getEvidenceHistory('8888888888')
        
        assert.equal(caseIds.length, 4)
        assert.equal(states[0].toString(), '0') // CHECKEDIN (initial add)
        assert.equal(states[1].toString(), '1') // CHECKEDOUT
        assert.equal(states[2].toString(), '0') // CHECKEDIN
        assert.equal(states[3].toString(), '2') // REMOVED
      })

      it('returns all cases', async () => {
        const cases = await chainOfCustody.getCases()
        assert.isTrue(cases.length > 0)
        assert.include(cases, caseId)
      })
    })
  })
})