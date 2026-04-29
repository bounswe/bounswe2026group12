from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.recipes.models import Recipe, Comment

User = get_user_model()

class CommentQuestionAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', email='user1@example.com', password='password123')
        self.user2 = User.objects.create_user(username='user2', email='user2@example.com', password='password123')
        
        self.recipe1 = Recipe.objects.create(
            title='Recipe 1',
            description='Test description 1',
            author=self.user1,
            qa_enabled=True,
            is_published=True
        )
        
        self.recipe2 = Recipe.objects.create(
            title='Recipe 2',
            description='Test description 2',
            author=self.user2,
            qa_enabled=False,
            is_published=True
        )
        
        self.comment1 = Comment.objects.create(
            recipe=self.recipe1,
            author=self.user1,
            body='First comment on recipe 1',
            type='COMMENT'
        )

    def test_anon_user_behavior(self):
        """Anon GET allowed, POST/DELETE forbidden."""
        # GET
        url = f'/api/recipes/{self.recipe1.id}/comments/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # POST
        data = {'body': 'Anon comment', 'type': 'COMMENT'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # DELETE
        url_delete = f'/api/comments/{self.comment1.id}/'
        response = self.client.delete(url_delete)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_permissions(self):
        """Author gets 204, non-author gets 403."""
        url = f'/api/comments/{self.comment1.id}/'
        
        # Non-author tries to delete
        self.client.force_authenticate(user=self.user2)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Author tries to delete
        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Comment.objects.count(), 0)

    def test_qa_enabled_logic(self):
        """Check qa_enabled flag when posting QUESTION."""
        self.client.force_authenticate(user=self.user1)
        
        # Recipe 1 has qa_enabled=True
        url1 = f'/api/recipes/{self.recipe1.id}/comments/'
        data1 = {'body': 'A question?', 'type': 'QUESTION'}
        response1 = self.client.post(url1, data1)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Recipe 2 has qa_enabled=False
        url2 = f'/api/recipes/{self.recipe2.id}/comments/'
        data2 = {'body': 'A question?', 'type': 'QUESTION'}
        response2 = self.client.post(url2, data2)
        self.assertEqual(response2.status_code, status.HTTP_403_FORBIDDEN)
        
        # Recipe 2 allows COMMENT despite qa_enabled=False
        data3 = {'body': 'A comment.', 'type': 'COMMENT'}
        response3 = self.client.post(url2, data3)
        self.assertEqual(response3.status_code, status.HTTP_201_CREATED)

    def test_reply_flow_and_validation(self):
        """Test reply flow and parent_comment cross-recipe validation."""
        self.client.force_authenticate(user=self.user1)
        
        url1 = f'/api/recipes/{self.recipe1.id}/comments/'
        
        # Valid reply
        data_valid = {'body': 'A reply', 'type': 'COMMENT', 'parent_comment': self.comment1.id}
        response_valid = self.client.post(url1, data_valid)
        self.assertEqual(response_valid.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_valid.data['parent_comment'], self.comment1.id)
        
        # Invalid reply (parent comment belongs to recipe 1, but we post to recipe 2)
        url2 = f'/api/recipes/{self.recipe2.id}/comments/'
        data_invalid = {'body': 'A reply', 'type': 'COMMENT', 'parent_comment': self.comment1.id}
        response_invalid = self.client.post(url2, data_invalid)
        self.assertEqual(response_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('parent_comment', response_invalid.data)

    def test_comment_vs_question_typing(self):
        """Verify COMMENT and QUESTION types are handled correctly."""
        self.client.force_authenticate(user=self.user1)
        url = f'/api/recipes/{self.recipe1.id}/comments/'
        
        # Default type is COMMENT
        data_default = {'body': 'Just body'}
        response1 = self.client.post(url, data_default)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response1.data['type'], 'COMMENT')
        
        # Explicit QUESTION
        data_question = {'body': 'Is this a question?', 'type': 'QUESTION'}
        response2 = self.client.post(url, data_question)
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.data['type'], 'QUESTION')

    def test_pagination(self):
        """Verify pagination works for comments list."""
        for i in range(15):
            Comment.objects.create(
                recipe=self.recipe1,
                author=self.user1,
                body=f'Comment {i}',
                type='COMMENT'
            )
            
        url = f'/api/recipes/{self.recipe1.id}/comments/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if paginated structure exists
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        
        self.assertEqual(response.data['count'], 16)
