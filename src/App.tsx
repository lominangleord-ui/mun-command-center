import { HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Dashboard from "./app/dashboard/Dashboard";
import Vault from "./app/vault/Vault";
import SpeechBuilder from "./app/speech-builder/SpeechBuilder";
import ClauseBuilder from "./app/clause-builder/ClauseBuilder";
import BlocTracker from "./app/bloc-tracker/BlocTracker";
import VotingRoom from "./app/voting-room/VotingRoom";
import ExportCenter from "./app/export-center/ExportCenter";
import LiveCommittee from "./app/live/LiveCommittee";
import Snapshots from "./app/snapshots/Snapshots";
import Memory from "./app/memory/Memory";
import NegotiationWorkspace from "./app/negotiation-workspace/NegotiationWorkspace";
import CountryIntelligence from "./app/country-intelligence/CountryIntelligence";
import ClauseImpactSimulation from "./app/clause-impact/ClauseImpactSimulation";
import ResearchCenter from "./app/research-center/ResearchCenter";
import AiSettings from "./app/ai-settings/AiSettings";

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveCommittee />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/bloc-tracker" element={<BlocTracker />} />
            <Route path="/country-intelligence" element={<CountryIntelligence />} />
            <Route path="/research-center" element={<ResearchCenter />} />
            <Route path="/ai-settings" element={<AiSettings />} />
            <Route path="/negotiation-workspace" element={<NegotiationWorkspace />} />
            <Route path="/speech-builder" element={<SpeechBuilder />} />
            <Route path="/clause-builder" element={<ClauseBuilder />} />
            <Route path="/clause-impact" element={<ClauseImpactSimulation />} />
            <Route path="/voting-room" element={<VotingRoom />} />
            <Route path="/snapshots" element={<Snapshots />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/export-center" element={<ExportCenter />} />
          </Routes>
        </Layout>
      </AppProvider>
    </HashRouter>
  );
}
