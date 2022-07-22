import { Flex } from "rimble-ui";
import React, { Component } from 'react';
import TableRow from '../TableRow/TableRow';
import TableHeader from '../TableHeader/TableHeader';
import FunctionsUtil from '../utilities/FunctionsUtil';
import TrancheField from '../TrancheField/TrancheField';

class TranchesList extends Component {

  state = {};

  // Utils
  functionsUtil = null;

  loadUtils(){
    if (this.functionsUtil){
      this.functionsUtil.setProps(this.props);
    } else {
      this.functionsUtil = new FunctionsUtil(this.props);
    }
  }

  async componentDidMount(){
    this.loadUtils();
  }

  async componentDidUpdate(prevProps, prevState) {
    this.loadUtils();
  }

  render() {

    let enabledProtocols = this.props.enabledProtocols;
    if (!enabledProtocols || !enabledProtocols.length){
      enabledProtocols = Object.keys(this.props.availableTranches);
    }

    let orderedTranches = [];
    if (this.props.tranchesOrdering){
      this.props.tranchesOrdering.forEach( t => {
        if (enabledProtocols.includes(t.protocol)){
          const token = t.token;
          const protocol = t.protocol;
          if (this.props.availableTranches[protocol] && this.props.availableTranches[protocol][token]){
            const tokenConfig = this.props.availableTranches[protocol][token];
            orderedTranches.push({
              token,
              protocol,
              tokenConfig
            });
          }
        }
      });
    } else {
      enabledProtocols.forEach(protocol => {
        const protocolTranches = this.props.availableTranches[protocol];
        if (!protocolTranches){
          return null;
        }
        Object.keys(protocolTranches).forEach( token => {
          const tokenConfig = protocolTranches[token];
          if (tokenConfig){
            orderedTranches.push({
              token,
              protocol,
              tokenConfig
            });
          }
         })
      })
    }

    const depositedTokens = this.props.depositedTokens;
    if (depositedTokens){
      orderedTranches = orderedTranches.filter( t => {
        return depositedTokens.find( d => d.token === t.token && d.protocol === t.protocol )
      });
    }

    return (
      <Flex
        width={1}
        flexDirection={'column'}
        id={"tranches-list-container"}
      >
        <TableHeader
          {...this.props}
          cols={this.props.cols}
          isMobile={this.props.isMobile}
          colsProps={this.props.colsProps}
        />
        {
          orderedTranches && orderedTranches.length>0 && (
            <Flex
              id={"tranches-list"}
              flexDirection={'column'}
            >
              {
                orderedTranches.map( p => {
                  const token = p.token;
                  const protocol = p.protocol;
                  const tokenConfig = p.tokenConfig;
                  const tranche = this.props.trancheType || null;
                  return (
                    <TableRow
                      {...this.props}
                      token={token}
                      tranche={tranche}
                      protocol={protocol}
                      tokenConfig={tokenConfig}
                      rowId={`tranche-col-${protocol}`}
                      cardId={`tranche-card-${protocol}`}
                      key={`tranche-${protocol}-${token}`}
                      fieldComponent={this.props.fieldComponent || TrancheField}
                    />
                  )
                })
              }
            </Flex>
          )
        }
      </Flex>
    );
  }
}

export default TranchesList;
