import './App.css';
import Emoji from 'a11y-react-emoji';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p className='emoji-icon'><Emoji symbol="🖕" label="fuck-you" /></p>
        <p>
          Fuck you Gehad & Fadi
        </p>
      </header>
    </div>
  );
}

export default App;
