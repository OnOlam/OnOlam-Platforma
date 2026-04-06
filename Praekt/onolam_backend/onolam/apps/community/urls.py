from django.urls import path
from . import views

urlpatterns = [
    path('channels/',                        views.channel_list,         name='channel-list'),
    path('posts/',                           views.post_list,            name='post-list'),
    path('posts/create/',                    views.post_create,          name='post-create'),
    path('posts/<int:pk>/like/',             views.post_like,            name='post-like'),
    path('posts/<int:pk>/delete/',           views.post_delete,          name='post-delete'),
    path('posts/<int:post_pk>/comments/',    views.comment_list_create,  name='comment-list'),
    path('chat/<slug:channel_slug>/',            views.chat_messages,        name='chat-messages'),
    path('posts/<int:pk>/edit/',                 views.post_edit,            name='post-edit'),
    path('chat/message/<int:pk>/delete/',        views.chat_delete,          name='chat-delete'),
    path('dm/',                                  views.dm_conversations,     name='dm-list'),
    path('dm/<int:user_id>/',                    views.dm_messages,          name='dm-messages'),
    path('users/',                               views.user_search,          name='user-search'),
    path('stats/',                               views.sidebar_stats,        name='sidebar-stats'),
]
