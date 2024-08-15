import React, { Component } from "react";
import { render } from "react-dom";
import ListChantier from "./ListChantier"

export default class App extends Component {    
    constructor(props) {
        super(props);
    }

    render() {
        return <div>
        <ListChantier />

        </div> 
    }
}


const appDiv = document.getElementById("app");
render(<App/>, appDiv);