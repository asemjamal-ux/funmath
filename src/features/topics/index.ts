// The advanced Worlds' module (decision 005): importing it installs the generators and the pictures.
// It loads on demand through TopicsGate, so the startup bundle never carries it (NFR-01).
import '../../domain/math/topics';
import '../../services/content/topicGenerators';
import { installTopicPicture } from '../../components/MathDisplay';
import { TopicPicture } from './TopicPicture';

installTopicPicture(TopicPicture);

export const TOPICS_READY = true;
