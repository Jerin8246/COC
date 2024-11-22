import React, { Component } from 'react';
import Web3 from 'web3';
import './App.css';
import ChainOfCustody from './contracts/ChainOfCustody.json';

class App extends Component {
  async componentWillMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3;
    const accounts = await web3.eth.getAccounts();
    this.setState({ account: accounts[0] });

    const networkId = await web3.eth.net.getId();
    const networkData = ChainOfCustody.networks[networkId];
    
    if(networkData) {
      const contract = new web3.eth.Contract(ChainOfCustody.abi, networkData.address);
      this.setState({ contract });
      await this.loadData();
    } else {
      window.alert('ChainOfCustody contract not deployed to detected network.');
    }
  }

  constructor(props) {
    super(props);
    this.state = {
      account: '',
      contract: null,
      cases: [],
      newCaseId: '',
      newItemId: '',
      loading: false,
      error: null
    };
  }

  async loadData() {
    try {
      const cases = await this.state.contract.methods.getCases().call();
      this.setState({ cases });
    } catch (error) {
      this.setState({ error: 'Error loading cases' });
    }
  }

  handleAddEvidence = async (e) => {
    e.preventDefault();
    this.setState({ loading: true, error: null });
    
    try {
      await this.state.contract.methods
        .addEvidence(this.state.newCaseId, this.state.newItemId)
        .send({ from: this.state.account });
      
      await this.loadData();
      this.setState({ newCaseId: '', newItemId: '' });
    } catch (error) {
      this.setState({ error: error.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  handleCheckout = async (itemId) => {
    this.setState({ loading: true, error: null });
    
    try {
      await this.state.contract.methods
        .checkoutEvidence(itemId)
        .send({ from: this.state.account });
      
      await this.loadData();
    } catch (error) {
      this.setState({ error: error.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  handleCheckin = async (itemId) => {
    this.setState({ loading: true, error: null });
    
    try {
      await this.state.contract.methods
        .checkinEvidence(itemId)
        .send({ from: this.state.account });
      
      await this.loadData();
    } catch (error) {
      this.setState({ error: error.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  render() {
    return (
      <div>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a className="navbar-brand col-sm-3 col-md-2 mr-0" href="#">
            Chain of Custody
          </a>
          <ul className="navbar-nav px-3">
            <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
              <small className="text-white">
                <span id="account">{this.state.account}</span>
              </small>
            </li>
          </ul>
        </nav>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex">
              <div className="content mr-auto ml-auto" style={{ width: '600px' }}>
                <h2>Add New Evidence</h2>
                <form onSubmit={this.handleAddEvidence}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Case ID"
                      value={this.state.newCaseId}
                      onChange={(e) => this.setState({ newCaseId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Item ID"
                      value={this.state.newItemId}
                      onChange={(e) => this.setState({ newItemId: e.target.value })}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={this.state.loading}
                  >
                    {this.state.loading ? 'Processing...' : 'Add Evidence'}
                  </button>
                </form>

                {this.state.error && (
                  <div className="alert alert-danger mt-3">
                    {this.state.error}
                  </div>
                )}

                <h2 className="mt-4">Cases</h2>
                <ul className="list-group">
                  {this.state.cases.map((caseId, index) => (
                    <li key={index} className="list-group-item">
                      {caseId}
                    </li>
                  ))}
                </ul>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;